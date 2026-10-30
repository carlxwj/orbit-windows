using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using Microsoft.Win32.SafeHandles;

namespace OrbitBridge {
  public static class Storage {
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)] static extern SafeFileHandle CreateFile(string path, uint access, uint share, IntPtr security, uint creation, uint flags, IntPtr template);
    [DllImport("kernel32.dll", SetLastError = true)] static extern bool DeviceIoControl(SafeFileHandle device, uint code, byte[] input, int inputSize, byte[] output, int outputSize, out int returned, IntPtr overlapped);
    static string DescriptorString(byte[] data, int offset) {
      if (offset <= 0 || offset >= data.Length) return "";
      int end = offset; while (end < data.Length && data[end] != 0) end++;
      return Encoding.ASCII.GetString(data, offset, end - offset).Trim();
    }
    public static object Read() {
      var numbers = new HashSet<int>(); var partitions = new List<object>();
      foreach (var drive in DriveInfo.GetDrives()) {
        if (!drive.IsReady || drive.Name.Length < 2 || drive.DriveType == DriveType.Network) continue;
        string letter = drive.Name.Substring(0, 2);
        using (var volume = CreateFile(@"\\.\" + letter, 0, 3, IntPtr.Zero, 3, 0, IntPtr.Zero)) {
          if (volume.IsInvalid) continue; int returned; byte[] extents = new byte[8192];
          if (!DeviceIoControl(volume, 0x00560000, null, 0, extents, extents.Length, out returned, IntPtr.Zero) || returned < 32) continue;
          uint count = BitConverter.ToUInt32(extents, 0);
          for (int i = 0; i < Math.Min(count, 128) && 8 + i * 24 + 24 <= returned; i++) {
            int number = BitConverter.ToInt32(extents, 8 + i * 24); if (number < 0 || number > 1024) continue;
            numbers.Add(number); partitions.Add(new { DiskNumber = number, DriveLetter = letter.Substring(0, 1) });
          }
        }
      }
      var disks = new List<object>(); var map = new List<object>();
      foreach (int number in numbers) using (var device = CreateFile(@"\\.\PhysicalDrive" + number, 0, 3, IntPtr.Zero, 3, 0, IntPtr.Zero)) {
        if (device.IsInvalid) continue; int returned; byte[] descriptor = new byte[8192]; var query = new byte[12];
        if (!DeviceIoControl(device, 0x002d1400, query, query.Length, descriptor, descriptor.Length, out returned, IntPtr.Zero) || returned < 36) continue;
        string vendor = DescriptorString(descriptor, BitConverter.ToInt32(descriptor, 12));
        string model = DescriptorString(descriptor, BitConverter.ToInt32(descriptor, 16)); uint bus = BitConverter.ToUInt32(descriptor, 28);
        byte[] geometry = new byte[512]; ulong? capacity = null;
        if (DeviceIoControl(device, 0x000700a0, null, 0, geometry, geometry.Length, out returned, IntPtr.Zero) && returned >= 32) capacity = BitConverter.ToUInt64(geometry, 24);
        byte[] seekQuery = new byte[12]; seekQuery[0] = 7; byte[] seek = new byte[32]; int? media = bus == 17 ? (int?)4 : null;
        if (DeviceIoControl(device, 0x002d1400, seekQuery, seekQuery.Length, seek, seek.Length, out returned, IntPtr.Zero) && returned >= 9) media = seek[8] != 0 ? 3 : 4;
        byte[] prediction = new byte[516]; string health = null;
        if (DeviceIoControl(device, 0x002d1100, null, 0, prediction, prediction.Length, out returned, IntPtr.Zero) && returned >= 4) health = BitConverter.ToUInt32(prediction, 0) == 0 ? "Aucune panne prédite par le pilote" : "Panne prédite par le pilote";
        disks.Add(new { DeviceId = number.ToString(), FriendlyName = model, Manufacturer = vendor, Size = capacity, MediaType = media, BusType = bus, healthText = health });
        map.Add(new { Number = number, FriendlyName = model, Size = capacity });
      }
      return new { disks = disks, partitions = partitions, diskMap = map };
    }
  }
}
