using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;

namespace OrbitBridge {
  public static class Counters {
    static IntPtr query = IntPtr.Zero;
    static readonly Dictionary<string, IntPtr> Handles = new Dictionary<string, IntPtr>();
    static readonly object Gate = new object();
    [StructLayout(LayoutKind.Sequential)] struct Value { public uint status; public double value; }
    [StructLayout(LayoutKind.Sequential)] struct Item { public IntPtr name; public Value value; }
    [DllImport("pdh.dll", CharSet = CharSet.Unicode)] static extern uint PdhOpenQuery(string source, IntPtr user, out IntPtr query);
    [DllImport("pdh.dll", CharSet = CharSet.Unicode)] static extern uint PdhAddEnglishCounter(IntPtr query, string path, IntPtr user, out IntPtr counter);
    [DllImport("pdh.dll")] static extern uint PdhCollectQueryData(IntPtr query);
    [DllImport("pdh.dll")] static extern uint PdhGetFormattedCounterValue(IntPtr counter, uint format, out uint type, out Value value);
    [DllImport("pdh.dll", CharSet = CharSet.Unicode)] static extern uint PdhGetFormattedCounterArray(IntPtr counter, uint format, ref uint bytes, out uint count, IntPtr buffer);
    static void Initialize() {
      if (query != IntPtr.Zero) return;
      if (PdhOpenQuery(null, IntPtr.Zero, out query) != 0) return;
      var paths = new Dictionary<string, string> {
        {"cpuMHz",@"\Processor Information(_Total)\Processor Frequency"},
        {"diskRead",@"\PhysicalDisk(_Total)\Disk Read Bytes/sec"}, {"diskWrite",@"\PhysicalDisk(_Total)\Disk Write Bytes/sec"},
        {"diskIdle",@"\PhysicalDisk(_Total)\% Idle Time"}, {"gpuEngines",@"\GPU Engine(*)\Utilization Percentage"},
        {"gpuDedicated",@"\GPU Adapter Memory(*)\Dedicated Usage"}, {"gpuShared",@"\GPU Adapter Memory(*)\Shared Usage"}
      };
      foreach (var pair in paths) { IntPtr counter; if (PdhAddEnglishCounter(query, pair.Value, IntPtr.Zero, out counter) == 0) Handles[pair.Key] = counter; }
    }
    public static object Read() {
      lock (Gate) {
        Initialize(); var result = new Dictionary<string, object>();
        if (query == IntPtr.Zero || PdhCollectQueryData(query) != 0) return result;
        foreach (var pair in Handles) {
          if (pair.Key.StartsWith("gpu")) {
            uint bytes = 0, count;
            PdhGetFormattedCounterArray(pair.Value, 0x200, ref bytes, out count, IntPtr.Zero);
            if (bytes == 0 || bytes > 4194304) continue;
            IntPtr buffer = Marshal.AllocHGlobal((int)bytes);
            try {
              if (PdhGetFormattedCounterArray(pair.Value, 0x200, ref bytes, out count, buffer) != 0) continue;
              var items = new List<object>(); int size = Marshal.SizeOf(typeof(Item));
              for (int i = 0; i < count; i++) {
                var item = (Item)Marshal.PtrToStructure(IntPtr.Add(buffer, size * i), typeof(Item));
                if (item.value.status <= 1 && !Double.IsNaN(item.value.value) && !Double.IsInfinity(item.value.value)) items.Add(new { name = Marshal.PtrToStringUni(item.name), value = item.value.value });
              }
              result[pair.Key] = items;
            } finally { Marshal.FreeHGlobal(buffer); }
          } else {
            Value value; uint type;
            if (PdhGetFormattedCounterValue(pair.Value, 0x200, out type, out value) == 0 && value.status <= 1 && !Double.IsNaN(value.value) && !Double.IsInfinity(value.value)) result[pair.Key] = value.value;
          }
        }
        return result;
      }
    }
  }
}
