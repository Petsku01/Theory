import subprocess
import tkinter as tk
from tkinter import messagebox
import platform
import ctypes
import logging
try:
    import win32qos
    import win32com.client
    import pythoncom
except ImportError:
    win32qos = None
    win32com = None
    pythoncom = None

class LagSwitchGUI:
    def __init__(self, root):
        """Initialize the LagSwitch GUI application."""
        # Configure logging
        logging.basicConfig(filename='lagswitch.log', level=logging.ERROR, 
                           format='%(asctime)s - %(levelname)s - %(message)s')

        # Check if running on Windows
        if platform.system() != "Windows":
            messagebox.showerror("Error", "This application only works on Windows")
            root.quit()
            return

        # Check for admin privileges
        if not self.is_admin():
            messagebox.showerror("Error", "This application requires administrative privileges")
            root.quit()
            return

        # Check for pywin32 dependency
        if win32qos is None:
            messagebox.showerror("Error", "pywin32 is required. Install it using 'pip install pywin32'")
            root.quit()
            return

        self.root = root
        self.root.title("LagSwitch 2000")
        self.root.geometry("300x250")
        self.root.configure(bg="#333333")  # Dark retro background
        self.throttled = False  # Tracks throttling state
        self.throttle_kbps = tk.StringVar(value="100")  # Default throttle value
        self.adapter_name_var = tk.StringVar(value="Ethernet")  # Default adapter name
        self.qos_policy_name = "LagSwitchThrottle"  # Name for QoS policy

        # Create retro-style GUI elements
        tk.Label(root, text="LagSwitch 2000", font=("Courier", 16, "bold"), 
                 bg="#333333", fg="#00FF00").pack(pady=10)
        tk.Label(root, text="Adapter:", font=("Courier", 12), 
                 bg="#333333", fg="#FFFFFF").pack()
        tk.Entry(root, textvariable=self.adapter_name_var, font=("Courier", 12), 
                 width=15).pack()
        tk.Label(root, text="Throttle (Kbps):", font=("Courier", 12), 
                 bg="#333333", fg="#FFFFFF").pack()
        tk.Entry(root, textvariable=self.throttle_kbps, font=("Courier", 12), 
                 width=10).pack()

        # Initialize buttons
        self.start_button = tk.Button(root, text="Start Lag", font=("Courier", 12, "bold"), 
                                     bg="#006600", fg="#FFFFFF", command=self.start_lag)
        self.start_button.pack(pady=10)
        self.stop_button = tk.Button(root, text="Stop Lag", font=("Courier", 12, "bold"), 
                                    bg="#660000", fg="#FFFFFF", command=self.stop_lag)
        self.stop_button.pack(pady=5)
        tk.Button(root, text="Exit", font=("Courier", 12), bg="#555555", fg="#FFFFFF", 
                  command=self.exit_app).pack(pady=5)

        # Status label
        self.status = tk.Label(root, text="Status: Idle", font=("Courier", 10), 
                               bg="#333333", fg="#FFFF00")
        self.status.pack(pady=10)

        # Bind window close event
        self.root.protocol("WM_DELETE_WINDOW", self.exit_app)

    def is_admin(self):
        """Check if the script is running with admin privileges."""
        try:
            return ctypes.windll.shell32.IsUserAnAdmin()
        except:
            return False

    def validate_adapter(self):
        """Validate if the specified network adapter exists."""
        self.adapter_name = self.adapter_name_var.get().strip()
        if not self.adapter_name:
            messagebox.showerror("Error", "Adapter name cannot be empty")
            return False
        try:
            pythoncom.CoInitialize()  # Initialize COM for this thread
            wmi = win32com.client.GetObject("winmgmts:")
            adapters = wmi.InstancesOf("Win32_NetworkAdapter")
            adapter_names = [adapter.Properties_["NetConnectionID"].Value for adapter in adapters 
                            if adapter.Properties_["NetConnectionID"].Value]
            pythoncom.CoUninitialize()
            if self.adapter_name not in adapter_names:
                raise ValueError(f"Network adapter '{self.adapter_name}' not found")
            return True
        except Exception as e:
            logging.error(f"Failed to validate adapter: {str(e)}")
            messagebox.showerror("Error", f"Failed to validate adapter: {str(e)}")
            return False

    def apply_throttle(self, kbps):
        """Apply bandwidth throttle using Windows QoS API."""
        self.start_button.config(state="disabled")
        self.stop_button.config(state="disabled")
        try:
            if not self.validate_adapter():
                return
            # Initialize QoS
            qos_handle = win32qos.QOSCreateHandle(win32qos.QOS_VERSION)
            if not qos_handle:
                raise RuntimeError("Failed to create QoS handle")

            # Remove any existing policy
            try:
                win32qos.QOSRemoveFlow(qos_handle, 0)  # 0 removes all flows
            except:
                pass  # Ignore if no previous flow exists

            # Create a new QoS flow
            flow_id = win32qos.QOSAddFlow(
                qos_handle,
                self.adapter_name,  # Interface name
                win32qos.QOS_NON_ADAPTIVE_FLOW,  # Non-adaptive flow
                int(kbps * 1000),  # Convert Kbps to bytes per second
                0,  # Peak bandwidth (0 = unlimited)
                0,  # Latency (0 = default)
                win32qos.QOS_SHAPING  # Shape traffic
            )
            if not flow_id:
                raise RuntimeError("Failed to add QoS flow")

            self.status.config(text=f"Status: Throttled to {kbps} Kbps")
            self.throttled = True
            self.qos_handle = qos_handle
            self.flow_id = flow_id
        except Exception as e:
            logging.error(f"Failed to apply throttle: {str(e)}")
            messagebox.showerror("Error", f"Failed to apply throttle: {str(e)}")
        finally:
            self.start_button.config(state="normal")
            self.stop_button.config(state="normal")

    def remove_throttle(self):
        """Remove bandwidth throttle rule."""
        self.start_button.config(state="disabled")
        self.stop_button.config(state="disabled")
        try:
            if hasattr(self, 'qos_handle') and hasattr(self, 'flow_id'):
                win32qos.QOSRemoveFlow(self.qos_handle, self.flow_id)
                win32qos.QOSCloseHandle(self.qos_handle)
            self.status.config(text="Status: Idle")
            self.throttled = False
        except Exception as e:
            logging.error(f"Failed to remove throttle: {str(e)}")
            messagebox.showerror("Error", f"Failed to remove throttle: {str(e)}")
        finally:
            self.start_button.config(state="normal")
            self.stop_button.config(state="normal")

    def start_lag(self):
        """Start throttling with user-specified Kbps."""
        if not self.throttled:
            try:
                kbps_input = self.throttle_kbps.get().strip()
                if not kbps_input:
                    messagebox.showerror("Error", "Throttle Kbps cannot be empty")
                    return
                kbps = int(kbps_input)
                if kbps <= 0:
                    messagebox.showerror("Error", "Throttle Kbps must be positive")
                    return
                if kbps < 10 or kbps > 10000:
                    messagebox.showwarning("Invalid Input", 
                                         "Enter Kbps between 10 and 10000")
                    return
                self.apply_throttle(kbps)
            except ValueError:
                messagebox.showerror("Error", "Enter a valid number for Kbps")
            except Exception as e:
                logging.error(f"Unexpected error in start_lag: {str(e)}")
                messagebox.showerror("Error", f"Unexpected error: {str(e)}")

    def stop_lag(self):
        """Stop throttling if active."""
        if self.throttled:
            self.remove_throttle()
        else:
            messagebox.showinfo("Info", "No throttle is currently active")

    def exit_app(self):
        """Clean up throttle rules and exit the application."""
        try:
            if self.throttled:
                self.remove_throttle()
        except Exception as e:
            logging.error(f"Cleanup failed: {str(e)}")
            messagebox.showerror("Error", f"Cleanup failed: {str(e)}")
        finally:
            self.root.quit()

if __name__ == "__main__":
    try:
        root = tk.Tk()
        app = LagSwitchGUI(root)
        root.mainloop()
    except Exception as e:
        logging.error(f"Application failed to start: {str(e)}")
        messagebox.showerror("Error", f"Application failed to start: {str(e)}")
