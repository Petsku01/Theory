"""
Theoritical Lag Switch Detection System
For TCP/UDP socket game servers to detect potential lag switch abuse

Theory:
- Monitors ping times and packet rates to detect artificial lag patterns
- Flags players showing suspicious network behavior patterns

Integration with Real Server:
Replace simulate_server() with your actual server loop. 

Example integration for getting ping (RTT):
    start_time = time.time()
    send_packet(client, "ping")
    reply = receive_packet(client)  # Assume "pong" response
    ping_ms = (time.time() - start_time) * 1000

Example for counting packets per second:
    packets = count_messages(client, interval=1)  # Messages received in 1 second
"""

import time
from collections import deque
import socket
import threading
import logging

# Setup logging for flagged users
logging.basicConfig(
    filename='lagswitch_flags.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

class LagSwitchDetector:
    """Detects potential lag switch usage by monitoring network metrics."""
    
    def __init__(self):
        """Initialize detector with default thresholds."""
        self.players = {}  # {player_id: {'ping': deque, 'packets': deque, 'flags': int, 'last_flagged': float}}
        self.PING_THRESHOLD = 150  # ms - ping spike above this is suspicious
        self.PACKET_THRESHOLD = 10  # packets/sec - drop below this is suspicious
        self.MAX_FLAGS = 3  # Number of suspicious events before flagging player
        self.WINDOW_SECONDS = 10  # Time window for analysis
        self.MAX_PINGS = 100  # Store last 100 ping samples (~10 sec at 10Hz)
        self.MAX_PACKETS = 100  # Store last 100 packet rate samples
        self.FLAG_COOLDOWN = 30  # Seconds before a player can be flagged again

    def update_player(self, player_id, ping_ms, packets_per_sec):
        """
        Update player metrics and check for lag switch patterns.
        
        Args:
            player_id: Unique identifier for the player
            ping_ms: Current ping in milliseconds
            packets_per_sec: Current packet rate
        """
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

        # Check for lag switch patterns after each update
        self.check_lag_switch(player_id)

    def check_lag_switch(self, player_id):
        """
        Analyze player metrics for lag switch patterns.
        
        Args:
            player_id: Player to check
        """
        player = self.players[player_id]
        current_time = time.time()

        # Skip if player was recently flagged (cooldown period)
        if current_time - player['last_flagged'] < self.FLAG_COOLDOWN:
            return

        # Need minimum data samples before analysis
        if len(player['ping']) < 5 or len(player['packets']) < 5:
            return

        # Analyze ping spikes
        pings = list(player['ping'])
        avg_ping = sum(pings) / len(pings)
        max_ping = max(pings)
        
        # Flag if ping spike is both above threshold AND significantly above average
        if max_ping > self.PING_THRESHOLD and max_ping > 2 * avg_ping:
            player['flags'] += 1
            logging.info(
                f"Player {player_id}: Ping spike detected "
                f"(max: {max_ping}ms, avg: {avg_ping:.1f}ms). "
                f"Total flags: {player['flags']}"
            )
            player['last_flagged'] = current_time

        # Analyze packet drops
        packets = list(player['packets'])
        min_packets = min(packets)
        avg_packets = sum(packets) / len(packets)
        
        # Flag if packet rate drops below threshold AND is significantly below average
        if min_packets < self.PACKET_THRESHOLD and min_packets < 0.5 * avg_packets:
            player['flags'] += 1
            logging.info(
                f"Player {player_id}: Packet drop detected "
                f"(min: {min_packets}/sec, avg: {avg_packets:.1f}/sec). "
                f"Total flags: {player['flags']}"
            )
            player['last_flagged'] = current_time

        # Take action if player exceeds flag limit
        if player['flags'] >= self.MAX_FLAGS:
            logging.warning(
                f"Player {player_id}: SUSPECTED LAG SWITCH USER! "
                f"Total flags: {player['flags']}"
            )
            print(f"\n⚠️  ALERT: Player {player_id} flagged for potential lag switching!")
            # Here you would implement game-specific actions:
            # - Notify admins
            # - Reduce player trust score
            # - Apply temporary restrictions
            # - Queue for manual review

    def cleanup_player(self, player_id):
        """
        Remove player data on disconnect.
        
        Args:
            player_id: Player to remove
        """
        if player_id in self.players:
            logging.info(f"Player {player_id}: Removed from monitoring (disconnected)")
            del self.players[player_id]

    def get_player_status(self, player_id):
        """
        Get current status of a player.
        
        Args:
            player_id: Player to check
            
        Returns:
            dict: Player status or None if not found
        """
        if player_id in self.players:
            player = self.players[player_id]
            pings = list(player['ping'])
            packets = list(player['packets'])
            
            return {
                'player_id': player_id,
                'flags': player['flags'],
                'avg_ping': sum(pings) / len(pings) if pings else 0,
                'avg_packets': sum(packets) / len(packets) if packets else 0,
                'sample_count': len(pings),
                'is_suspicious': player['flags'] >= self.MAX_FLAGS
            }
        return None


def simulate_server():
    """Simulate a game server with normal and suspicious players."""
    detector = LagSwitchDetector()
    
    def handle_player(player_id, pings, packet_rates):
        """
        Simulate a player connection.
        
        Args:
            player_id: Player identifier
            pings: List of ping values to simulate
            packet_rates: List of packet rate values to simulate
        """
        print(f"Player {player_id} connected")
        
        for ping, packets in zip(pings, packet_rates):
            detector.update_player(player_id, ping, packets)
            time.sleep(0.1)  # Simulate ~10Hz update rate
            
        # Print final status before disconnect
        status = detector.get_player_status(player_id)
        if status:
            print(f"\nPlayer {player_id} final status:")
            print(f"  - Flags: {status['flags']}")
            print(f"  - Avg Ping: {status['avg_ping']:.1f}ms")
            print(f"  - Avg Packets: {status['avg_packets']:.1f}/sec")
            print(f"  - Suspicious: {status['is_suspicious']}")
            
        detector.cleanup_player(player_id)
        print(f"Player {player_id} disconnected")

    # Simulate normal player (stable connection)
    normal_player_thread = threading.Thread(
        target=handle_player,
        args=(
            "Player1_Normal",
            [20 + i % 5 for i in range(100)],  # Ping varies 20-24ms
            [50 + i % 3 for i in range(100)]   # Packets vary 50-52/sec
        )
    )
    
    # Simulate lag switch user (artificial lag spikes)
    suspicious_player_thread = threading.Thread(
        target=handle_player,
        args=(
            "Player2_Suspicious",
            # Pattern: normal -> spike -> normal (typical lag switch)
            [20 if i % 10 < 7 else 200 + i % 50 for i in range(100)],
            # Packet drops during "lag switch activation"
            [50 if i % 10 < 7 else 5 for i in range(100)]
        )
    )
    
    # Start both player simulations
    normal_player_thread.start()
    suspicious_player_thread.start()
    
    # Wait for simulations to complete
    normal_player_thread.join()
    suspicious_player_thread.join()


def main():
    """Main entry point."""
    print("=" * 50)
    print("LAG SWITCH DETECTOR - SIMULATION")
    print("=" * 50)
    print("Starting simulation with 2 players:")
    print("  - Player1_Normal: Stable connection")
    print("  - Player2_Suspicious: Lag switch patterns")
    print("-" * 50)
    
    simulate_server()
    
    print("\n" + "=" * 50)
    print("Simulation complete. Check 'lagswitch_flags.log' for details.")
    print("=" * 50)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nShutting down lag switch detector...")
    except Exception as e:
        logging.error(f"Unexpected error: {e}")
        print(f"\n❌ Error: {e}")
