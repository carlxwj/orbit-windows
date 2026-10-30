using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;

namespace OrbitBridge {
  public static class Gpu {
    [StructLayout(LayoutKind.Sequential)] struct Luid { public uint low; public int high; }
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)] struct Desc {
      [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string name;
      public uint vendor, device, subsystem, revision; public UIntPtr dedicated, system, shared; public Luid luid; public uint flags;
    }
    [DllImport("dxgi.dll")] static extern int CreateDXGIFactory1(ref Guid iid, out IntPtr factory);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] delegate int EnumAdapter(IntPtr self, uint index, out IntPtr adapter);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] delegate int GetDesc(IntPtr self, out Desc desc);
    static T VTable<T>(IntPtr self, int index) where T : class { return Marshal.GetDelegateForFunctionPointer(Marshal.ReadIntPtr(Marshal.ReadIntPtr(self), index * IntPtr.Size), typeof(T)) as T; }
    public static object Inventory() {
      var rows = new List<object>(); IntPtr factory; var guid = new Guid("770AAE78-F26F-4DBA-A829-253C83D1B387");
      Marshal.ThrowExceptionForHR(CreateDXGIFactory1(ref guid, out factory));
      try {
        var enumerate = VTable<EnumAdapter>(factory, 12);
        for (uint i = 0; i < 32; i++) {
          IntPtr adapter; if (enumerate(factory, i, out adapter) != 0) break;
          try {
            Desc desc; Marshal.ThrowExceptionForHR(VTable<GetDesc>(adapter, 10)(adapter, out desc));
            if ((desc.flags & 2) != 0) continue;
            rows.Add(new { id = String.Format("luid_0x{0:x8}_0x{1:x8}", (uint)desc.luid.high, desc.luid.low), name = desc.name, vendor = desc.vendor,
              deviceId = desc.device, dedicated = desc.dedicated.ToUInt64(), sharedCapacity = desc.shared.ToUInt64() });
          } finally { Marshal.Release(adapter); }
        }
      } finally { Marshal.Release(factory); }
      return rows;
    }
    // Read-only NVML. DCH drivers place nvml.dll in System32; standard drivers use NVSMI.
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)] static extern IntPtr LoadLibraryEx(string file, IntPtr reserved, uint flags);
    [DllImport("kernel32.dll", CharSet = CharSet.Ansi)] static extern IntPtr GetProcAddress(IntPtr module, string name);
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate int Init();
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate int Count(out uint count);
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate int Handle(uint index, out IntPtr device);
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate int Text(IntPtr device, StringBuilder value, uint length);
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate int UIntValue(IntPtr device, out uint value);
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate int UIntKind(IntPtr device, uint kind, out uint value);
    [StructLayout(LayoutKind.Sequential)] struct Util { public uint gpu, memory; }
    [StructLayout(LayoutKind.Sequential)] struct Memory { public ulong total, free, used; }
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate int UtilValue(IntPtr device, out Util value);
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate int MemoryValue(IntPtr device, out Memory value);
    static IntPtr module = IntPtr.Zero; static bool attempted; static readonly object Gate = new object();
    static T Function<T>(string name) where T : class {
      if (module == IntPtr.Zero) return null; IntPtr pointer = GetProcAddress(module, name);
      return pointer == IntPtr.Zero ? null : Marshal.GetDelegateForFunctionPointer(pointer, typeof(T)) as T;
    }
    static void Initialize() {
      if (attempted) return; attempted = true;
      string[] paths = { System.IO.Path.Combine(Environment.SystemDirectory, "nvml.dll"), System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"NVIDIA Corporation\NVSMI\nvml.dll") };
      foreach (string path in paths) if (System.IO.File.Exists(path)) { module = LoadLibraryEx(path, IntPtr.Zero, 0x900); if (module != IntPtr.Zero) break; }
      var init = Function<Init>("nvmlInit_v2"); if (init == null || init() != 0) module = IntPtr.Zero;
    }
    static object ReadUInt(IntPtr device, string name) { uint value; var fn = Function<UIntValue>(name); return fn != null && fn(device, out value) == 0 && value != UInt32.MaxValue ? (object)value : null; }
    static object ReadKind(IntPtr device, string name, uint kind) { uint value; var fn = Function<UIntKind>(name); return fn != null && fn(device, kind, out value) == 0 && value != UInt32.MaxValue ? (object)value : null; }
    public static object Read() {
      lock (Gate) {
        Initialize(); var rows = new List<object>();
        var countFn = Function<Count>("nvmlDeviceGetCount_v2"); var handleFn = Function<Handle>("nvmlDeviceGetHandleByIndex_v2"); uint count;
        if (countFn == null || handleFn == null || countFn(out count) != 0) return rows;
        for (uint i = 0; i < count; i++) {
          IntPtr device; if (handleFn(i, out device) != 0) continue;
          var name = new StringBuilder(128); var nameFn = Function<Text>("nvmlDeviceGetName"); if (nameFn != null) nameFn(device, name, 128);
          var uuid = new StringBuilder(128); var uuidFn = Function<Text>("nvmlDeviceGetUUID"); if (uuidFn != null) uuidFn(device, uuid, 128);
          var utilFn = Function<UtilValue>("nvmlDeviceGetUtilizationRates"); Util util; object usage = utilFn != null && utilFn(device, out util) == 0 ? (object)util.gpu : null;
          var memFn = Function<MemoryValue>("nvmlDeviceGetMemoryInfo"); Memory mem = new Memory(); bool valid = memFn != null && memFn(device, out mem) == 0 && mem.total > 0 && mem.used <= mem.total && mem.free <= mem.total;
          // NVML may return NOT_SUPPORTED under WDDM; unavailable values stay null.
          object power = ReadUInt(device, "nvmlDeviceGetPowerUsage");
          rows.Add(new { id = uuid.ToString(), name = name.ToString(), load = usage, used = valid ? (object)mem.used : null, total = valid ? (object)mem.total : null,
            temperature = ReadKind(device, "nvmlDeviceGetTemperature", 0), clock = ReadKind(device, "nvmlDeviceGetClockInfo", 0), memoryClock = ReadKind(device, "nvmlDeviceGetClockInfo", 2),
            power = power == null ? null : (object)(Convert.ToDouble(power) / 1000), fan = ReadUInt(device, "nvmlDeviceGetFanSpeed") });
        }
        return rows;
      }
    }
    public static void Shutdown() { lock (Gate) { var fn = Function<Init>("nvmlShutdown"); if (fn != null) fn(); } }
  }
}
