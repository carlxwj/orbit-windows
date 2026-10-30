using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.NetworkInformation;
using System.Text;
using System.Threading.Tasks;
using System.Threading;
using System.Web.Script.Serialization;
using System.Runtime.InteropServices;

namespace OrbitBridge {
  public static class Program {
    static readonly object OutputLock = new object();
    static int active;
    [DllImport("user32.dll")] static extern bool SetProcessDpiAwarenessContext(IntPtr value);
    public static void Main() {
      SetProcessDpiAwarenessContext(new IntPtr(-4));
      Console.InputEncoding = new UTF8Encoding(false);
      Console.OutputEncoding = new UTF8Encoding(false);
      string line;
      while ((line = Console.ReadLine()) != null) {
        if (line.Length > 16384) continue;
        string input = line;
        Interlocked.Increment(ref active);
        Task.Run(() => { try { Dispatch(input); } finally { Interlocked.Decrement(ref active); } });
      }
      for (int i = 0; i < 30 && Volatile.Read(ref active) > 0; i++) Thread.Sleep(100);
      Gpu.Shutdown();
    }
    static void Dispatch(string line) {
      int id = 0;
      try {
        var json = new JavaScriptSerializer { MaxJsonLength = 4194304 };
        var request = json.Deserialize<Dictionary<string, object>>(line);
        id = Convert.ToInt32(request["id"]);
        string command = Convert.ToString(request["command"]);
        object result;
        switch (command) {
          case "fast": result = Fast(); break;
          case "inventory": result = Inventory.Read(); break;
          case "audio":
            int volume = request.ContainsKey("volume") ? Convert.ToInt32(request["volume"]) : -1;
            bool? mute = request.ContainsKey("muted") ? (bool?)Convert.ToBoolean(request["muted"]) : null;
            if (volume < -1 || volume > 100) throw new ArgumentException();
            result = Audio.Read(volume, mute, true); break;
          case "ping": result = new { version = "2.0.0", runtime = Environment.Version.ToString() }; break;
          case "diagnostics":
            using (var process = System.Diagnostics.Process.GetCurrentProcess()) result = new { workingSet = process.WorkingSet64, cpuMilliseconds = process.TotalProcessorTime.TotalMilliseconds };
            break;
          default: throw new ArgumentException();
        }
        Write(new { id = id, ok = true, data = result });
      } catch (UnauthorizedAccessException) { Write(new { id = id, ok = false, error = "permission_required" }); }
      catch { Write(new { id = id, ok = false, error = "temporarily_unavailable" }); }
    }
    static void Write(object value) {
      string text = new JavaScriptSerializer { MaxJsonLength = 4194304 }.Serialize(value);
      lock (OutputLock) { Console.WriteLine(text); Console.Out.Flush(); }
    }
    public static object Attempt(Func<object> read) { try { return read(); } catch { return null; } }
    public static object Fast() {
      return new {
        timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
        network = Attempt(() => Network()), audio = Attempt(() => Audio.Read(-1, null, false)),
        gpus = Attempt(() => Gpu.Read()), counters = Attempt(() => Counters.Read()),
        battery = Attempt(() => Battery()), sensors = Sensors.Sample(), sensorTimestamp = Sensors.Timestamp
      };
    }
    public static object Network() {
      return NetworkInterface.GetAllNetworkInterfaces().Where(n => n.OperationalStatus == OperationalStatus.Up && n.NetworkInterfaceType != NetworkInterfaceType.Loopback).Select(n => {
        var s = n.GetIPv4Statistics();
        return new { id = n.Id, name = n.Name, type = n.NetworkInterfaceType.ToString(), speed = n.Speed,
          status = n.OperationalStatus.ToString(), ipv4 = n.GetIPProperties().UnicastAddresses.Where(x => x.Address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork).Select(x => x.Address.ToString()).ToArray(), received = s.BytesReceived, sent = s.BytesSent };
      }).ToArray();
    }
    [StructLayout(LayoutKind.Sequential)] struct PowerStatus { public byte ac, flag, percent, reserved; public uint life, full; }
    [DllImport("kernel32.dll")] static extern bool GetSystemPowerStatus(out PowerStatus status);
    static object Battery() { PowerStatus status; return GetSystemPowerStatus(out status) && status.percent != 255 && (status.flag & 128) == 0 ? (object)(int)status.percent : null; }
  }
}
