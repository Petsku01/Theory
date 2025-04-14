# Only for theory, never used in any device.

import os
import tkinter as tk
from tkinter import messagebox
import time
import threading

class LagSwitchGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("LagSwitch 2000")
        self.root.geometry("300x200")
        self.root.configure(bg="#333333")  # Dark, retro look
        self.throttled = False
        self.adapter_name = "Ethernet"  # Update with your adapter (run `netsh interface show interface`)
        self.throttle_kbps = tk.StringVar(value="100")  # Default throttle: 100 Kbps

        # Retro-style GUI elements
        tk.Label(root, text="LagSwitch 2000", font=("Courier", 16, "bold"), bg="#333333", fg="#00FF00").pack(pady=10)

        tk.Label(root, text="Throttle (Kbps):", font=("Courier", 12), bg="#333333", fg="#FFFFFF").pack()
        tk.Entry(root, textvariable=self.throttle_kbps, font=("Courier", 12), width=10).pack()

        tk.Button(root, text="Start Lag", font=("Courier", 12, "bold"), bg="#006600", fg="#FFFFFF",
                  command=self.start_lag).pack(pady=10)
        tk.Button(root, text="Stop Lag", font=("Courier", 12, "bold"), bg="#660000", fg="#FFFFFF",
                  command=self.stop_lag).pack(pady=5)
        tk.Button(root, text="Exit", font=("Courier", 12), bg="#555555", fg="#FFFFFF",
                  command=self.exit_app).pack(pady=5)

        # Status label
        self.status = tk.Label(root, text="Status: Idle", font=("Courier", 10), bg="#333333", fg="#FFFF00")
        self.status.pack(pady=10)

    def apply_throttle(self, kbps):
        """Apply bandwidth throttle using netsh."""
        # Clear existing rules
        os.system('netsh advfirewall firewall delete rule name="LagSwitchThrottle"')
        # Add throttle rule
        command = (
            f'netsh advfirewall firewall add rule name="LagSwitchThrottle" '
            f'dir=out action=allow protocol=any '
            f'localip=any remoteip=any '
            f'throttle={kbps}'
        )
        try:
            os.system(command)
            self.status.config(text=f"Status: Throttled to {kbps} Kbps")
            self.throttled = True
        except Exception as e:
            messagebox.showerror("Error", f"Failed to throttle: {e}")

    def remove_throttle(self):
        """Remove bandwidth throttle."""
        os.system('netsh advfirewall firewall delete rule name="LagSwitchThrottle"')
        self.status.config(text="Status: Idle")
        self.throttled = False

    def start_lag(self):
        """Start throttling in a separate thread."""
        if not self.throttled:
            try:
                kbps = int(self.throttle_kbps.get())
                if kbps < 10 or kbps > 10000:
                    messagebox.showwarning("Invalid Input", "Enter Kbps between 10 and 10000")
                    return
                threading.Thread(target=self.apply_throttle, args=(kbps,), daemon=True).start()
            except ValueError:
                messagebox.showerror("Error", "Enter a valid number for Kbps")

    def stop_lag(self):
        """Stop throttling."""
        if self.throttled:
            threading.Thread(target=self.remove_throttle, daemon=True).start()

    def exit_app(self):
        """Clean up and exit."""
        self.remove_throttle()
        self.root.quit()
