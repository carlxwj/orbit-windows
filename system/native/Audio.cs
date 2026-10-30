using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;

namespace OrbitBridge {
  [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumerator {}
  [ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDeviceEnumerator {
    [PreserveSig] int EnumAudioEndpoints(int flow, uint mask, out IMMDeviceCollection devices);
    [PreserveSig] int GetDefaultAudioEndpoint(int flow, int role, out IMMDevice device);
  }
  [ComImport, Guid("0BD7A1BE-7A1A-44DB-8397-CC5392387B5E"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDeviceCollection {
    [PreserveSig] int GetCount(out uint count);
    [PreserveSig] int Item(uint index, out IMMDevice device);
  }
  [ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDevice {
    [PreserveSig] int Activate(ref Guid iid, int clsctx, IntPtr activation, [MarshalAs(UnmanagedType.IUnknown)] out object obj);
    [PreserveSig] int OpenPropertyStore(int access, out IPropertyStore store);
    [PreserveSig] int GetId([MarshalAs(UnmanagedType.LPWStr)] out string id);
    [PreserveSig] int GetState(out uint state);
  }
  [StructLayout(LayoutKind.Sequential)] struct PropertyKey { public Guid fmtid; public uint pid; }
  [StructLayout(LayoutKind.Explicit, Size = 24)] struct PropVariant { [FieldOffset(0)] public ushort type; [FieldOffset(8)] public IntPtr pointer; }
  [ComImport, Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IPropertyStore {
    [PreserveSig] int GetCount(out uint count); [PreserveSig] int GetAt(uint index, out PropertyKey key);
    [PreserveSig] int GetValue(ref PropertyKey key, out PropVariant value);
  }
  [ComImport, Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioEndpointVolume {
    [PreserveSig] int RegisterControlChangeNotify(IntPtr p); [PreserveSig] int UnregisterControlChangeNotify(IntPtr p);
    [PreserveSig] int GetChannelCount(out uint count); [PreserveSig] int SetMasterVolumeLevel(float db, Guid context);
    [PreserveSig] int SetMasterVolumeLevelScalar(float level, Guid context); [PreserveSig] int GetMasterVolumeLevel(out float db);
    [PreserveSig] int GetMasterVolumeLevelScalar(out float level); [PreserveSig] int SetChannelVolumeLevel(uint ch, float db, Guid context);
    [PreserveSig] int SetChannelVolumeLevelScalar(uint ch, float level, Guid context); [PreserveSig] int GetChannelVolumeLevel(uint ch, out float db);
    [PreserveSig] int GetChannelVolumeLevelScalar(uint ch, out float level); [PreserveSig] int SetMute([MarshalAs(UnmanagedType.Bool)] bool mute, Guid context);
    [PreserveSig] int GetMute([MarshalAs(UnmanagedType.Bool)] out bool mute);
  }
  public static class Audio {
    static readonly object Gate = new object();
    [DllImport("ole32.dll")] static extern int PropVariantClear(ref PropVariant value);
    static string Name(IMMDevice device) {
      IPropertyStore store = null;
      try {
        Marshal.ThrowExceptionForHR(device.OpenPropertyStore(0, out store));
        var key = new PropertyKey { fmtid = new Guid("A45C254E-DF1C-4EFD-8020-67D146A850E0"), pid = 14 };
        PropVariant value; Marshal.ThrowExceptionForHR(store.GetValue(ref key, out value));
        try { return value.type == 31 ? Marshal.PtrToStringUni(value.pointer) : "Sortie audio"; }
        finally { PropVariantClear(ref value); }
      } finally { if (store != null) Marshal.ReleaseComObject(store); }
    }
    public static object Read(int volume, bool? mute, bool enumerate) {
      lock (Gate) {
        IMMDeviceEnumerator enumerator = null; IMMDevice device = null; object obj = null;
        try {
          enumerator = (IMMDeviceEnumerator)new MMDeviceEnumerator();
          Marshal.ThrowExceptionForHR(enumerator.GetDefaultAudioEndpoint(0, 1, out device));
          var iid = typeof(IAudioEndpointVolume).GUID;
          Marshal.ThrowExceptionForHR(device.Activate(ref iid, 23, IntPtr.Zero, out obj));
          var endpoint = (IAudioEndpointVolume)obj;
          if (volume >= 0) Marshal.ThrowExceptionForHR(endpoint.SetMasterVolumeLevelScalar(volume / 100f, Guid.Empty));
          if (mute.HasValue) Marshal.ThrowExceptionForHR(endpoint.SetMute(mute.Value, Guid.Empty));
          float level; bool muted;
          Marshal.ThrowExceptionForHR(endpoint.GetMasterVolumeLevelScalar(out level));
          Marshal.ThrowExceptionForHR(endpoint.GetMute(out muted));
          string defaultId; device.GetId(out defaultId);
          var outputs = new List<object>();
          if (enumerate) {
            IMMDeviceCollection collection = null;
            try {
              Marshal.ThrowExceptionForHR(enumerator.EnumAudioEndpoints(0, 1, out collection));
              uint count; collection.GetCount(out count);
              for (uint i = 0; i < Math.Min(count, 64); i++) {
                IMMDevice item = null;
                try { collection.Item(i, out item); string id; item.GetId(out id); outputs.Add(new { id = id, name = Name(item), isDefault = id == defaultId }); }
                finally { if (item != null) Marshal.ReleaseComObject(item); }
              }
            } finally { if (collection != null) Marshal.ReleaseComObject(collection); }
          }
          return new { volume = (int)Math.Round(level * 100), muted = muted, name = Name(device), outputs = outputs };
        } finally {
          if (obj != null) Marshal.ReleaseComObject(obj);
          if (device != null) Marshal.ReleaseComObject(device);
          if (enumerator != null) Marshal.ReleaseComObject(enumerator);
        }
      }
    }
  }
}
