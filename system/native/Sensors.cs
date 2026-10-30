using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace OrbitBridge {
  public static class Sensors {
    static object cached = new List<object>();
    static bool available;
    static int busy;
    public static long Timestamp;
    public static object Inventory() {
      try {
        object value = OrbitBridge.Inventory.Query(@"root\LibreHardwareMonitor", "SELECT Name,SensorType,Value FROM Sensor");
        cached = value; available = true; Interlocked.Exchange(ref Timestamp, DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()); return value;
      } catch { available = false; throw; }
    }
    public static object Sample() {
      // Only an already exposed WMI provider is read, on a separate, throttled task.
      if (available && DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() - Interlocked.Read(ref Timestamp) > 30000 && Interlocked.CompareExchange(ref busy, 1, 0) == 0) {
        Task.Run(() => { try { Inventory(); } catch { } finally { Interlocked.Exchange(ref busy, 0); } });
      }
      return cached;
    }
  }
}
