# Theory
# Only proving that it can be done
# For TCP/UDP socket server

import time
from collections import deque
import socket
import threading
import logging

# Setup logging for flagged users
logging.basicConfig(filename='lagswitch_flags.log', level=logging.INFO,
                    format='%(asctime)s - %(message)s')

class LagSwitchDetector:
    def __init__(self):
        self.players = {}  # {player_id: {'ping': deque, 'packets': deque, 'flags': int}}
        self.PING_THRESHOLD = 150  # ms (spike above this flags)
        self.PACKET_THRESHOLD = 10  # packets/sec (drop below this flags)
        self.MAX_FLAGS = 3  # Flag player after 3 suspicious events
        self.WINDOW_SECONDS = 10  # Analyze last 10 seconds
        self.MAX_PINGS = 100  # Store ~100 pings (10 sec at 10Hz)
        self.MAX_PACKETS = 100  # Store ~100 packet counts

    def update_player(self, player_id, ping_ms, packets_per_sec):
        """Update player metrics and check for lag switch."""
        if player_id not in self.players:
            self.players[player_id] = {
                'ping': deque(maxlen=self.MAX_PINGS),
                'packets': deque(maxlen=self.MAX_PACKETS),
                'flags': 0,
                'last_flagged': 0
            }

        player = self.players[player_id]
        player['ping'].append(ping_ms)
        player['packets'].append(packets_per_sec)

        # Check for lag switch patterns every update
        self.check_lag_switch(player_id)

    def check_lag_switch(self, player_id):
        """Flag player if ping spikes or packet drops suggest lag switch."""
        player = self.players[player_id]
        current_time = time.time()

        # Avoid flagging too frequently
        if current_time - player['last_flagged'] < 30:  # 30 sec cooldown
            return

        # Analyze ping (spikes)
        pings = list(player['ping'])
        if len(pings) < 5:  # Need enough data
            return
        avg_ping = sum(pings) / len(pings)
        max_ping = max(pings)
        if max_ping > self.PING_THRESHOLD and max_ping > 2 * avg_ping:
            # Spike: e.g., 200ms when avg is 20ms
            player['flags'] += 1
            logging.info(f"Player {player_id}: Ping spike detected ({max_ping}ms, avg {avg_ping:.1f}ms). Flags: {player['flags']}")

        # Analyze packet rate (drops)
        packets = list(player['packets'])
        if len(packets) < 5:
            return
        min_packets = min(packets)
        avg_packets = sum(packets) / len(packets)
        if min_packets < self.PACKET_THRESHOLD and min_packets < 0.5 * avg_packets:
            # Drop: e.g., 5 packets/sec when avg is 50
            player['flags'] += 1
            logging.info(f"Player {player_id}: Packet drop detected ({min_packets}/sec, avg {avg_packets:.1f}/sec). Flags: {player['flags']}")

        # Flag if suspicious
        if player['flags'] >= self.MAX_FLAGS:
            logging.warning(f"Player {player_id}: Suspected lag switch user! Total flags: {player['flags']}")
            player['last_flagged'] = current_time
            # Optional: Trigger game action (e.g., notify admin)
            print(f"ALERT: Player {player_id} flagged for lag switching!")

    def cleanup_player(self, player_id):
        """Remove player on disconnect."""
        if player_id in self.players:
            del self.players[player_id]

# Example: Simulated game server
def simulate_server():
    detector = LagSwitchDetector()

    # Simulate players (replace with real socket handling)
    def handle_player(player_id, pings, packet_rates):
        for ping, packets in zip(pings, packet_rates):
            detector.update_player(player_id, ping, packets)
            time.sleep(0.1)  # Simulate ~10Hz updates
        detector.cleanup_player(player_id)

    # Simulate Player1 (normal)
    threading.Thread(target=handle_player, args=(
        "Player1",
        [20, 21, 22, 20, 23] * 20,  # Stable ping ~20ms
        [50, 51, 49, 50, 52] * 20   # Stable packets ~50/sec
    )).start()

    # Simulate Player2 (lag switch user)
    threading.Thread(target=handle_player, args=(
        "Player2",
        [20, 20, 200, 200, 20] * 20,  # Spikes to 200ms (script toggle)
        [50, 50, 5, 5, 50] * 20       # Drops to 5 packets/sec (100 Kbps)
    )).start()

if __name__ == "__main__":
    print("Starting lag switch detector...")
    simulate_server()
    # Run indefinitely (replace with real server loop)
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Shutting down...")
