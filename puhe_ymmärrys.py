import whisper
import numpy as np
import matplotlib.pyplot as plt
from transformers import pipeline
import customtkinter as ctk
from PIL import Image, ImageTk
import threading
import queue
import sounddevice as sd
import sqlite3
import os
import time
from datetime import datetime
import scipy.io.wavfile as wavfile
import io
import logging
import asyncio
import uuid

# Configure logging for debugging and error tracking
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    filename='voice_recognition.log'
)

# Application configuration settings
CONFIG = {
    'sample_rate': 16000,  # Audio sampling rate
    'record_duration': 5,  # Duration of audio recording in seconds
    'waveform_size': (300, 150),  # Size of waveform visualization
    'db_path': 'voice_recognition.db',  # Database file path
    'whisper_model': 'tiny',  # Whisper model size
    'classifier_model': 'TurkuNLP/bert-base-finnish-cased-v1',  # Finnish text classifier
    'default_rules': [  # Default intent rules
        ("Tervehdys", "hei", 1.0), ("Tervehdys", "moro", 1.0), ("Tervehdys", "terve", 1.0),
        ("Kysymys", "miksi", 1.0), ("Kysymys", "kuinka", 1.0), ("Kysymys", "mitä", 1.0),
        ("Komento", "avaa", 1.0), ("Komento", "sulje", 1.0), ("Komento", "tee", 1.0),
        ("Jäähyväiset", "näkemiin", 1.0), ("Jäähyväiset", "hei hei", 1.0), ("Jäähyväiset", "lopeta", 1.0)
    ]
}

# Set customtkinter theme for consistent UI appearance
try:
    ctk.set_appearance_mode("dark")
    ctk.set_default_color_theme("blue")
except Exception as e:
    logging.error(f"Failed to set customtkinter theme: {e}")

# Initialize models with error handling
try:
    model = whisper.load_model(CONFIG['whisper_model'])
    classifier = pipeline("text-classification", model=CONFIG['classifier_model'])
except Exception as e:
    logging.error(f"Model initialization failed: {e}")
    raise RuntimeError(f"Failed to initialize models: {e}")

# Queue for thread-safe GUI updates
result_queue = queue.Queue()

class Database:
    """Handles all database operations for audio, intents, and rules."""
    def __init__(self):
        self.db_path = CONFIG['db_path']
        self._init_database()

    def _init_database(self):
        """Initialize SQLite database with required tables."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                c = conn.cursor()
                # Create audio table
                c.execute("""CREATE TABLE IF NOT EXISTS audio (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT,
                    file_path TEXT,
                    transcription TEXT,
                    confidence REAL
                )""")
                # Create intents table
                c.execute("""CREATE TABLE IF NOT EXISTS intents (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT,
                    text TEXT,
                    intent TEXT,
                    confidence REAL
                )""")
                # Create rules table
                c.execute("""CREATE TABLE IF NOT EXISTS rules (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    intent TEXT,
                    keyword TEXT,
                    weight REAL
                )""")
                # Insert default rules
                c.executemany("INSERT OR IGNORE INTO rules (intent, keyword, weight) VALUES (?, ?, ?)", 
                             CONFIG['default_rules'])
                conn.commit()
                logging.info("Database initialized successfully")
        except sqlite3.Error as e:
            logging.error(f"Database initialization failed: {e}")
            raise RuntimeError(f"Failed to initialize database: {e}")

    def save_audio(self, audio, transcription, confidence):
        """Save audio to file and database."""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            file_path = f"audio_{timestamp}_{uuid.uuid4().hex[:8]}.wav"
            wavfile.write(file_path, CONFIG['sample_rate'], audio)
            
            with sqlite3.connect(self.db_path) as conn:
                c = conn.cursor()
                c.execute("INSERT INTO audio (timestamp, file_path, transcription, confidence) VALUES (?, ?, ?, ?)",
                         (timestamp, file_path, transcription, confidence))
                conn.commit()
            logging.info(f"Audio saved: {file_path}")
            return file_path
        except (sqlite3.Error, IOError) as e:
            logging.error(f"Failed to save audio: {e}")
            result_queue.put(("status", f"Virhe äänen tallennuksessa: {e}"))
            return None

    def save_intent(self, text, intent, confidence):
        """Save intent to database."""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            with sqlite3.connect(self.db_path) as conn:
                c = conn.cursor()
                c.execute("INSERT INTO intents (timestamp, text, intent, confidence) VALUES (?, ?, ?, ?)",
                         (timestamp, text, intent, confidence))
                conn.commit()
            logging.info(f"Intent saved: {intent}")
        except sqlite3.Error as e:
            logging.error(f"Failed to save intent: {e}")
            result_queue.put(("status", f"Virhe intentin tallennuksessa: {e}"))

    def get_rules(self):
        """Retrieve all rules from database."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                c = conn.cursor()
                c.execute("SELECT id, intent, keyword, weight FROM rules")
                return c.fetchall()
        except sqlite3.Error as e:
            logging.error(f"Failed to get rules: {e}")
            result_queue.put(("status", f"Virhe sääntöjen hakemisessa: {e}"))
            return []

    def add_rule(self, intent, keyword, weight=1.0):
        """Add new rule to database."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                c = conn.cursor()
                c.execute("INSERT INTO rules (intent, keyword, weight) VALUES (?, ?, ?)", 
                         (intent, keyword.lower(), weight))
                conn.commit()
            logging.info(f"Rule added: {intent} -> {keyword}")
        except sqlite3.Error as e:
            logging.error(f"Failed to add rule: {e}")
            result_queue.put(("status", f"Virhe säännön lisäyksessä: {e}"))

    def remove_rule(self, rule_id):
        """Remove rule from database."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                c = conn.cursor()
                c.execute("DELETE FROM rules WHERE id = ?", (rule_id,))
                conn.commit()
            logging.info(f"Rule removed: ID {rule_id}")
        except sqlite3.Error as e:
            logging.error(f"Failed to remove rule: {e}")
            result_queue.put(("status", f"Virhe säännön poistossa: {e}"))

    def alter_rule(self, rule_id, intent, keyword, weight):
        """Modify existing rule."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                c = conn.cursor()
                c.execute("UPDATE rules SET intent = ?, keyword = ?, weight = ? WHERE id = ?",
                         (intent, keyword.lower(), weight, rule_id))
                conn.commit()
            logging.info(f"Rule modified: ID {rule_id}")
        except sqlite3.Error as e:
            logging.error(f"Failed to modify rule: {e}")
            result_queue.put(("status", f"Virhe säännön muokkauksessa: {e}"))

    def get_database_content(self):
        """Retrieve database content for display."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                c = conn.cursor()
                c.execute("SELECT timestamp, transcription, confidence FROM audio ORDER BY timestamp DESC LIMIT 10")
                audio_data = c.fetchall()
                c.execute("SELECT timestamp, text, intent, confidence FROM intents ORDER BY timestamp DESC LIMIT 10")
                intent_data = c.fetchall()
                c.execute("SELECT id, intent, keyword, weight FROM rules")
                rule_data = c.fetchall()
            
            db_text = "Äänilokit (viimeiset 10):\n"
            for timestamp, transcription, confidence in audio_data:
                db_text += f"[{timestamp}] {transcription or 'N/A'} (Luottamus: {confidence:.2f})\n"
            
            db_text += "\nIntenttiloki (viimeiset 10):\n"
            for timestamp, text, intent, confidence in intent_data:
                db_text += f"[{timestamp}] {text} -> {intent} (Luottamus: {confidence:.2f})\n"
            
            db_text += "\nSäännöt:\n"
            for rule_id, intent, keyword, weight in rule_data:
                db_text += f"ID: {rule_id} | {intent}: {keyword} (Paino: {weight:.2f})\n"
            
            return db_text, rule_data
        except sqlite3.Error as e:
            logging.error(f"Failed to get database content: {e}")
            result_queue.put(("status", f"Virhe tietokannan sisällön haussa: {e}"))
            return "", []

class AudioProcessor:
    """Handles audio capture, transcription, and text understanding."""
    def __init__(self):
        self.sample_rate = CONFIG['sample_rate']
        self.duration = CONFIG['record_duration']

    async def capture_voice(self):
        """Capture audio from microphone and generate waveform visualization."""
        try:
            result_queue.put(("status", "Äänitetään..."))
            audio = sd.rec(int(self.duration * self.sample_rate), samplerate=self.sample_rate, channels=1)
            sd.wait()
            audio = audio.flatten()

            # Generate waveform plot
            plt.figure(figsize=(4, 2))
            plt.plot(audio, color='blue')
            plt.title("Ääniaalto")
            plt.xlabel("Näytteet")
            plt.ylabel("Amplitudi")
            plt.tight_layout()

            img_buffer = io.BytesIO()
            plt.savefig(img_buffer, format="png")
            plt.close()
            img_buffer.seek(0)
            logging.info("Audio captured successfully")
            return audio, img_buffer
        except Exception as e:
            logging.error(f"Audio capture failed: {e}")
            result_queue.put(("status", f"Virhe äänityksessä: {e}"))
            return None, None

    async def transcribe_audio(self, audio):
        """Transcribe audio to text using Whisper model."""
        if audio is None:
            logging.warning("No audio data to transcribe")
            return None, 0.0
        try:
            result = model.transcribe(audio, language="fi")
            text = result["text"].strip()
            confidence = 0.9 if text else 0.0
            logging.info(f"Transcription: {text}")
            return text, confidence
        except Exception as e:
            logging.error(f"Transcription failed: {e}")
            result_queue.put(("status", f"Virhe transkriptiossa: {e}"))
            return None, 0.0

    def understand_text(self, text, rules):
        """Classify text intent based on rules and classifier."""
        if not text or not isinstance(text, str):
            logging.warning("Invalid text for understanding")
            return "Ei kelvollista tekstiä.", "Yritä uudelleen.", "Muu", 0.0

        try:
            result = classifier(text)
            score = result[0]["score"]
            text_lower = text.lower()
            intent = "Muu"
            response = "En ymmärtänyt, voisitko sanoa uudelleen?"
            
            for _, rule_intent, keyword, _ in rules:
                if keyword in text_lower:
                    intent = rule_intent
                    if intent == "Tervehdys":
                        response = "Hei! Kuinka voin auttaa?"
                    elif intent == "Kysymys":
                        response = "Hyvä kysymys! Voisitko tarkentaa?"
                    elif intent == "Komento":
                        response = "Ymmärsin komennon, mutta tarkenna toimintaa."
                    elif intent == "Jäähyväiset":
                        response = "Näkemiin! Palataan pian."
                    break
            
            logging.info(f"Intent classified: {intent}")
            return f"Intentti: {intent} (Luottamus: {score:.2f})", response, intent, score
        except Exception as e:
            logging.error(f"Text understanding failed: {e}")
            result_queue.put(("status", f"Virhe tekstin käsittelyssä: {e}"))
            return "Virhe tekstin käsittelyssä.", "Yritä uudelleen.", "Muu", 0.0

class VoiceApp:
    """Main application class for voice recognition GUI."""
    def __init__(self):
        self.db = Database()
        self.audio_processor = AudioProcessor()
        self.root = ctk.CTk()
        self.running = True
        self.setup_gui()

    def setup_gui(self):
        """Setup the GUI components."""
        try:
            self.root.title("Puheentunnistus ja -ymmärrys")
            self.root.geometry("900x700")

            # Tab interface
            self.tabview = ctk.CTkTabview(self.root)
            self.tabview.pack(pady=10, fill="both", expand=True)

            # Main tab
            main_tab = self.tabview.add("Pääikkuna")
            ctk.CTkLabel(main_tab, text="Puhu mikrofoniin. Sano 'lopeta' poistuaksesi.", font=("Arial", 16)).pack(pady=10)

            frame = ctk.CTkFrame(main_tab)
            frame.pack(pady=10, fill="both", expand=True)

            self.text_area = ctk.CTkTextbox(frame, height=100, width=400, font=("Arial", 12))
            self.text_area.pack(side="left", padx=10)

            self.history_area = ctk.CTkTextbox(frame, height=100, width=300, font=("Arial", 12))
            self.history_area.pack(side="right", padx=10)

            self.waveform_label = ctk.CTkLabel(main_tab, text="")
            self.waveform_label.pack(pady=10)

            self.listen_button = ctk.CTkButton(main_tab, text="Kuuntele", command=self.start_listening, font=("Arial", 14))
            self.listen_button.pack(pady=10)

            # Database tab
            db_tab = self.tabview.add("Tietokanta")
            ctk.CTkLabel(db_tab, text="Tietokannan sisältö", font=("Arial", 16)).pack(pady=10)

            self.db_area = ctk.CTkTextbox(db_tab, height=150, width=600, font=("Arial", 12))
            self.db_area.pack(pady=10)

            ctk.CTkButton(db_tab, text="Päivitä tiedot", command=self.view_database, font=("Arial", 14)).pack(pady=5)

            # Rule management
            rule_frame = ctk.CTkFrame(db_tab)
            rule_frame.pack(pady=10, fill="x")

            # Add rule
            add_rule_frame = ctk.CTkFrame(rule_frame)
            add_rule_frame.pack(pady=5, fill="x")

            ctk.CTkLabel(add_rule_frame, text="Intentti:", font=("Arial", 12)).pack(side="left", padx=5)
            self.intent_entry = ctk.CTkEntry(add_rule_frame, width=150)
            self.intent_entry.pack(side="left", padx=5)

            ctk.CTkLabel(add_rule_frame, text="Avainsana:", font=("Arial", 12)).pack(side="left", padx=5)
            self.keyword_entry = ctk.CTkEntry(add_rule_frame, width=150)
            self.keyword_entry.pack(side="left", padx=5)

            ctk.CTkLabel(add_rule_frame, text="Paino:", font=("Arial", 12)).pack(side="left", padx=5)
            self.weight_entry = ctk.CTkEntry(add_rule_frame, width=100)
            self.weight_entry.pack(side="left", padx=5)

            ctk.CTkButton(add_rule_frame, text="Lisää sääntö", command=self.add_custom_rule, font=("Arial", 12)).pack(side="left", padx=5)

            # Rule list and modification
            rule_list_frame = ctk.CTkFrame(rule_frame)
            rule_list_frame.pack(pady=5, fill="x")

            self.rule_listbox = ctk.CTkListbox(rule_list_frame, height=100, width=600, font=("Arial", 12))
            self.rule_listbox.pack(side="left", padx=5)

            # Alter rule
            alter_rule_frame = ctk.CTkFrame(rule_frame)
            alter_rule_frame.pack(pady=5, fill="x")

            ctk.CTkLabel(alter_rule_frame, text="Uusi Intentti:", font=("Arial", 12)).pack(side="left", padx=5)
            self.alter_intent_entry = ctk.CTkEntry(alter_rule_frame, width=150)
            self.alter_intent_entry.pack(side="left", padx=5)

            ctk.CTkLabel(alter_rule_frame, text="Uusi Avainsana:", font=("Arial", 12)).pack(side="left", padx=5)
            self.alter_keyword_entry = ctk.CTkEntry(alter_rule_frame, width=150)
            self.alter_keyword_entry.pack(side="left", padx=5)

            ctk.CTkLabel(alter_rule_frame, text="Uusi Paino:", font=("Arial", 12)).pack(side="left", padx=5)
            self.alter_weight_entry = ctk.CTkEntry(alter_rule_frame, width=100)
            self.alter_weight_entry.pack(side="left", padx=5)

            ctk.CTkButton(alter_rule_frame, text="Muuta sääntö", command=self.alter_selected_rule, font=("Arial", 12)).pack(side="left", padx=5)

            ctk.CTkButton(rule_frame, text="Poista valittu sääntö", command=self.remove_selected_rule, font=("Arial", 12)).pack(pady=5)

            self.status_label = ctk.CTkLabel(self.root, text="Valmis", font=("Arial", 12))
            self.status_label.pack(pady=10)
        except Exception as e:
            logging.error(f"GUI setup failed: {e}")
            result_queue.put(("status", f"Virhe käyttöliittymän alustuksessa: {e}"))

    async def process_audio(self):
        """Process audio capture, transcription, and intent classification."""
        try:
            audio, img_buffer = await self.audio_processor.capture_voice()
            if audio is None:
                return
            text, confidence = await self.audio_processor.transcribe_audio(audio)
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            rules = self.db.get_rules()

            if text and text.lower() == "lopeta":
                result_queue.put(("main", "Lopetetaan ohjelma.", "", None, timestamp, "Jäähyväiset"))
                self.root.after(1000, self.root.quit)
                self.running = False
                return
            elif text:
                intent_str, response, intent, score = self.audio_processor.understand_text(text, rules)
                file_path = self.db.save_audio(audio, text, confidence)
                if file_path:
                    self.db.save_intent(text, intent, score)
                    result_queue.put(("main", f"Teksti: {text}\n{intent_str}", response, img_buffer, timestamp, intent))
                else:
                    result_queue.put(("main", "Äänen tallennus epäonnistui.", "Yritä uudelleen.", None, timestamp, "Muu"))
            else:
                result_queue.put(("main", "Ei tunnistettua puhetta.", "Yritä uudelleen.", None, timestamp, "Muu"))
            result_queue.put(("status", "Valmis"))
        except Exception as e:
            logging.error(f"Audio processing failed: {e}")
            result_queue.put(("status", f"Virhe äänen käsittelyssä: {e}"))

    def view_database(self):
        """Display database content in GUI."""
        try:
            db_text, rule_data = self.db.get_database_content()
            self.db_area.delete("1.0", ctk.END)
            self.db_area.insert("1.0", db_text)
            
            self.rule_listbox.delete(0, ctk.END)
            for rule_id, intent, keyword, weight in rule_data:
                self.rule_listbox.insert(ctk.END, f"ID: {rule_id} | {intent}: {keyword} (Paino: {weight:.2f})")
        except Exception as e:
            logging.error(f"Failed to display database content: {e}")
            self.status_label.configure(text=f"Virhe tietokannan näyttämisessä: {e}")

    def add_custom_rule(self):
        """Add a custom rule to the database."""
        try:
            intent = self.intent_entry.get().strip()
            keyword = self.keyword_entry.get().strip()
            try:
                weight = float(self.weight_entry.get().strip())
                if weight < 0:
                    raise ValueError("Painon tulee olla positiivinen")
            except ValueError:
                weight = 1.0
                self.status_label.configure(text="Käytetään oletuspainoa 1.0")

            if intent and keyword:
                self.db.add_rule(intent, keyword, weight)
                self.status_label.configure(text=f"Sääntö lisätty: {intent} -> {keyword}")
                self.intent_entry.delete(0, ctk.END)
                self.keyword_entry.delete(0, ctk.END)
                self.weight_entry.delete(0, ctk.END)
                self.view_database()
            else:
                self.status_label.configure(text="Syötä kelvolliset intentti ja avainsana!")
        except Exception as e:
            logging.error(f"Failed to add custom rule: {e}")
            self.status_label.configure(text=f"Virhe säännön lisäyksessä: {e}")

    def remove_selected_rule(self):
        """Remove selected rule from database."""
        try:
            selection = self.rule_listbox.curselection()
            if selection:
                rule_text = self.rule_listbox.get(selection[0])
                rule_id = int(rule_text.split("ID: ")[1].split(" |")[0])
                self.db.remove_rule(rule_id)
                self.status_label.configure(text=f"Sääntö ID {rule_id} poistettu")
                self.view_database()
            else:
                self.status_label.configure(text="Valitse poistettava sääntö!")
        except Exception as e:
            logging.error(f"Failed to remove rule: {e}")
            self.status_label.configure(text=f"Virhe poistaessa sääntöä: {e}")

    def alter_selected_rule(self):
        """Modify selected rule in database."""
        try:
            selection = self.rule_listbox.curselection()
            if selection:
                rule_text = self.rule_listbox.get(selection[0])
                rule_id = int(rule_text.split("ID: ")[1].split(" |")[0])
                intent = self.alter_intent_entry.get().strip()
                keyword = self.alter_keyword_entry.get().strip()
                try:
                    weight = float(self.alter_weight_entry.get().strip())
                    if weight < 0:
                        raise ValueError("Painon tulee olla positiivinen")
                except ValueError:
                    weight = 1.0
                    self.status_label.configure(text="Käytetään oletuspainoa 1.0")
                
                if intent and keyword:
                    self.db.alter_rule(rule_id, intent, keyword, weight)
                    self.status_label.configure(text=f"Sääntö ID {rule_id} muutettu")
                    self.alter_intent_entry.delete(0, ctk.END)
                    self.alter_keyword_entry.delete(0, ctk.END)
                    self.alter_weight_entry.delete(0, ctk.END)
                    self.view_database()
                else:
                    self.status_label.configure(text="Syötä kelvolliset intentti ja avainsana!")
            else:
                self.status_label.configure(text="Valitse muutettava sääntö!")
        except Exception as e:
            logging.error(f"Failed to modify rule: {e}")
            self.status_label.configure(text=f"Virhe muuttaessa sääntöä: {e}")

    def update_gui(self):
        """Update GUI based on queue results."""
        try:
            msg_type, result, response, img_buffer, timestamp, intent = result_queue.get_nowait()
            if msg_type == "main":
                self.text_area.delete("1.0", ctk.END)
                self.text_area.insert("1.0", f"{result}\nVastaus: {response}")
                self.history_area.insert(ctk.END, f"[{timestamp}] {result}\nVastaus: {response}\n\n")
                if img_buffer:
                    img = Image.open(img_buffer)
                    img = img.resize(CONFIG['waveform_size'], Image.Resampling.LANCZOS)
                    photo = ImageTk.PhotoImage(img)
                    self.waveform_label.configure(image=photo)
                    self.waveform_label.image = photo
                else:
                    self.waveform_label.configure(image=None)
            elif msg_type == "status":
                self.status_label.configure(text=result)
        except queue.Empty:
            pass
        except Exception as e:
            logging.error(f"GUI update failed: {e}")
            self.status_label.configure(text=f"Virhe käyttöliittymän päivityksessä: {e}")
        if self.running:
            self.root.after(100, self.update_gui)

    def start_listening(self):
        """Start audio listening in a separate thread."""
        try:
            self.listen_button.configure(state="disabled")
            threading.Thread(target=lambda: asyncio.run(self.process_audio()), daemon=True).start()
            self.root.after(6000, lambda: self.listen_button.configure(state="normal"))
        except Exception as e:
            logging.error(f"Failed to start listening: {e}")
            self.status_label.configure(text=f"Virhe kuuntelun aloituksessa: {e}")

    def run(self):
        """Run the application."""
        try:
            logging.info("Starting voice recognition application")
            self.root.after(100, self.update_gui)
            self.root.mainloop()
        except Exception as e:
            logging.error(f"Application run failed: {e}")
            self.status_label.configure(text=f"Virhe sovelluksen suorituksessa: {e}")

if __name__ == "__main__":
    try:
        app = VoiceApp()
        app.run()
    except Exception as e:
        logging.error(f"Application initialization failed: {e}")
        print(f"Failed to start application: {e}")
