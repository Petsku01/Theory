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

# Asettaa customtkinter-teema
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

# Ladataan Whisper-mallinen puheentunnistus (offline)
model = whisper.load_model("tiny")

# Alustetaan suomenkielinen classification/luokittelija
classifier = pipeline("text-classification", model="TurkuNLP/bert-base-finnish-cased-v1")

# Jonotusysteemi GUI-päivityksille
result_queue = queue.Queue()

# SQLite-tietokannan alustaus
def init_database():
    conn = sqlite3.connect("voice_recognition.db")
    c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS audio (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        file_path TEXT,
        transcription TEXT,
        confidence REAL
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS intents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        text TEXT,
        intent TEXT,
        confidence REAL
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        intent TEXT,
        keyword TEXT,
        weight REAL
    )""")
    # Lisää oletussääntö
    default_rules = [
        ("Tervehdys", "hei", 1.0), ("Tervehdys", "moro", 1.0), ("Tervehdys", "terve", 1.0),
        ("Kysymys", "miksi", 1.0), ("Kysymys", "kuinka", 1.0), ("Kysymys", "mitä", 1.0),
        ("Komento", "avaa", 1.0), ("Komento", "sulje", 1.0), ("Komento", "tee", 1.0),
        ("Jäähyväiset", "näkemiin", 1.0), ("Jäähyväiset", "hei hei", 1.0), ("Jäähyväiset", "lopeta", 1.0)
    ]
    c.executemany("INSERT OR IGNORE INTO rules (intent, keyword, weight) VALUES (?, ?, ?)", default_rules)
    conn.commit()
    conn.close()

def save_audio(audio, transcription, confidence):
    """Tallenna ääni tiedostoon ja tietokantaan."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_path = f"audio_{timestamp}.wav"
    sample_rate = 16000
    wavfile.write(file_path, sample_rate, audio)
    
    conn = sqlite3.connect("voice_recognition.db")
    c = conn.cursor()
    c.execute("INSERT INTO audio (timestamp, file_path, transcription, confidence) VALUES (?, ?, ?, ?)",
              (timestamp, file_path, transcription, confidence))
    conn.commit()
    conn.close()
    return file_path

def save_intent(text, intent, confidence):
    """Tallenna intentti tietokantaan."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    conn = sqlite3.connect("voice_recognition.db")
    c = conn.cursor()
    c.execute("INSERT INTO intents (timestamp, text, intent, confidence) VALUES (?, ?, ?, ?)",
              (timestamp, text, intent, confidence))
    conn.commit()
    conn.close()

def get_rules():
    """Hae kaikki säännöt tietokannasta."""
    conn = sqlite3.connect("voice_recognition.db")
    c = conn.cursor()
    c.execute("SELECT id, intent, keyword, weight FROM rules")
    rules = c.fetchall()
    conn.close()
    return rules

def add_rule(intent, keyword, weight=1.0):
    """Lisää uusi sääntö tietokantaan."""
    conn = sqlite3.connect("voice_recognition.db")
    c = conn.cursor()
    c.execute("INSERT INTO rules (intent, keyword, weight) VALUES (?, ?, ?)", (intent, keyword.lower(), weight))
    conn.commit()
    conn.close()

def remove_rule(rule_id):
    """Poista sääntö tietokannasta."""
    conn = sqlite3.connect("voice_recognition.db")
    c = conn.cursor()
    c.execute("DELETE FROM rules WHERE id = ?", (rule_id,))
    conn.commit()
    conn.close()

def alter_rule(rule_id, intent, keyword, weight):
    """Muuta olemassa olevia sääntöä."""
    conn = sqlite3.connect("voice_recognition.db")
    c = conn.cursor()
    c.execute("UPDATE rules SET intent = ?, keyword = ?, weight = ? WHERE id = ?",
              (intent, keyword.lower(), weight, rule_id))
    conn.commit()
    conn.close()

def capture_voice():
    """Ota ääntä mikrofonista."""
    try:
        result_queue.put(("status", "Äänitetään..."))
        sample_rate = 16000
        duration = 5
        audio = sd.rec(int(duration * sample_rate), samplerate=sample_rate, channels=1)
        sd.wait()
        audio = audio.flatten()

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
        return audio, img_buffer

    except Exception as e:
        print(f"Äänitysongelma: {e}")
        result_queue.put(("status", f"Virhe: {e}"))
        return None, None

def transcribe_audio(audio):
    """Muunna ääni tekstiksi Whisper-mallilla."""
    if audio is None:
        return None, 0.0
    try:
        result = model.transcribe(audio, language="fi")
        text = result["text"].strip()
        confidence = 0.9 if text else 0.0
        print(f"Tunnistettu teksti: {text}")
        return text, confidence
    except Exception as e:
        print(f"Transkriptiovirhe: {e}")
        return None, 0.0

def understand_text(text, rules):
    """Ymmärrä teksti ja luokittele."""
    if not text:
        return "Ei kelvollista tekstiä käsiteltäväksi.", "Yritä uudelleen.", "Muu", 0.0

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

    return f"Intentti: {intent} (Luottamus: {score:.2f})", response, intent, score

def process_audio():
    """Käsittele ääni ja päivitä GUI."""
    audio, img_buffer = capture_voice()
    text, confidence = transcribe_audio(audio)
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    rules = get_rules()
    
    if text and text.lower() == "lopeta":
        result_queue.put(("main", "Lopetetaan ohjelma.", "", None, timestamp, "Jäähyväiset"))
        root.after(1000, root.quit)
        return
    elif text:
        intent_str, response, intent, score = understand_text(text, rules)
        save_audio(audio, text, confidence)
        save_intent(text, intent, score)
        result_queue.put(("main", f"Teksti: {text}\n{intent_str}", response, img_buffer, timestamp, intent))
    else:
        result_queue.put(("main", "Ei tunnistettua puhetta.", "Yritä uudelleen.", None, timestamp, "Muu"))
    result_queue.put(("status", "Valmis"))

def view_database():
    """Näytä tietokannan sisältö."""
    conn = sqlite3.connect("voice_recognition.db")
    c = conn.cursor()
    
    c.execute("SELECT timestamp, transcription, confidence FROM audio ORDER BY timestamp DESC LIMIT 10")
    audio_data = c.fetchall()
    
    c.execute("SELECT timestamp, text, intent, confidence FROM intents ORDER BY timestamp DESC LIMIT 10")
    intent_data = c.fetchall()
    
    c.execute("SELECT id, intent, keyword, weight FROM rules")
    rule_data = c.fetchall()
    
    conn.close()
    
    db_text = "Äänilokit (viimeiset 10):\n"
    for timestamp, transcription, confidence in audio_data:
        db_text += f"[{timestamp}] {transcription} (Luottamus: {confidence:.2f})\n"
    
    db_text += "\nIntenttiloki (viimeiset 10):\n"
    for timestamp, text, intent, confidence in intent_data:
        db_text += f"[{timestamp}] {text} -> {intent} (Luottamus: {confidence:.2f})\n"
    
    db_text += "\nSäännöt:\n"
    for rule_id, intent, keyword, weight in rule_data:
        db_text += f"ID: {rule_id} | {intent}: {keyword} (Paino: {weight:.2f})\n"
    
    db_area.delete("1.0", ctk.END)
    db_area.insert("1.0", db_text)
    
    # Päivitä sääntöjen listbox
    rule_listbox.delete(0, ctk.END)
    for rule_id, intent, keyword, weight in rule_data:
        rule_listbox.insert(ctk.END, f"ID: {rule_id} | {intent}: {keyword} (Paino: {weight:.2f})")

def add_custom_rule():
    """Lisää määritetty sääntö."""
    intent = intent_entry.get()
    keyword = keyword_entry.get()
    try:
        weight = float(weight_entry.get())
    except ValueError:
        weight = 1.0
    if intent and keyword:
        add_rule(intent, keyword, weight)
        status_label.configure(text=f"Sääntö lisätty: {intent} -> {keyword}")
        intent_entry.delete(0, ctk.END)
        keyword_entry.delete(0, ctk.END)
        weight_entry.delete(0, ctk.END)
        view_database()
    else:
        status_label.configure(text="Syötä intentti ja avainsana!")

def remove_selected_rule():
    """Poista valittu sääntö."""
    try:
        selection = rule_listbox.curselection()
        if selection:
            rule_text = rule_listbox.get(selection[0])
            rule_id = int(rule_text.split("ID: ")[1].split(" |")[0])
            remove_rule(rule_id)
            status_label.configure(text=f"Sääntö ID {rule_id} poistettu")
            view_database()
        else:
            status_label.configure(text="Valitse poistettava sääntö!")
    except Exception as e:
        status_label.configure(text=f"Virhe poistaessa: {e}")

def alter_selected_rule():
    """Muuta valittua sääntöä."""
    try:
        selection = rule_listbox.curselection()
        if selection:
            rule_text = rule_listbox.get(selection[0])
            rule_id = int(rule_text.split("ID: ")[1].split(" |")[0])
            intent = alter_intent_entry.get()
            keyword = alter_keyword_entry.get()
            try:
                weight = float(alter_weight_entry.get())
            except ValueError:
                weight = 1.0
            if intent and keyword:
                alter_rule(rule_id, intent, keyword, weight)
                status_label.configure(text=f"Sääntö ID {rule_id} muutettu")
                alter_intent_entry.delete(0, ctk.END)
                alter_keyword_entry.delete(0, ctk.END)
                alter_weight_entry.delete(0, ctk.END)
                view_database()
            else:
                status_label.configure(text="Syötä intentti ja avainsana!")
        else:
            status_label.configure(text="Valitse muutettava sääntö!")
    except Exception as e:
        status_label.configure(text=f"Virhe muuttaessa: {e}")

def update_gui():
    """Päivitä GUI tiedots/jonosta saatujen tulosten perusteella."""
    try:
        msg_type, result, response, img_buffer, timestamp, intent = result_queue.get_nowait()
        if msg_type == "main":
            text_area.delete("1.0", ctk.END)
            text_area.insert("1.0", f"{result}\nVastaus: {response}")
            history_area.insert(ctk.END, f"[{timestamp}] {result}\nVastaus: {response}\n\n")
            if img_buffer:
                img = Image.open(img_buffer)
                img = img.resize((300, 150), Image.Resampling.LANCZOS)
                photo = ImageTk.PhotoImage(img)
                waveform_label.configure(image=photo)
                waveform_label.image = photo
            else:
                waveform_label.configure(image=None)
        elif msg_type == "status":
            status_label.configure(text=result)
    except queue.Empty:
        pass
    root.after(100, update_gui)

def start_listening():
    """Käynnistä äänen kuuntelu erillisessä säikeessä."""
    listen_button.configure(state="disabled")
    threading.Thread(target=process_audio, daemon=True).start()
    root.after(6000, lambda: listen_button.configure(state="normal"))

# Luo GUI:n 
root = ctk.CTk()
root.title("Puheentunnistus ja -ymmärrys")
root.geometry("900x700")

# Tab interface
tabview = ctk.CTkTabview(root)
tabview.pack(pady=10, fill="both", expand=True)

# Main tab
main_tab = tabview.add("Pääikkuna")
label = ctk.CTkLabel(main_tab, text="Puhu mikrofoniin. Sano 'lopeta' poistuaksesi.", font=("Arial", 16))
label.pack(pady=10)

frame = ctk.CTkFrame(main_tab)
frame.pack(pady=10, fill="both", expand=True)

text_area = ctk.CTkTextbox(frame, height=100, width=400, font=("Arial", 12))
text_area.pack(side="left", padx=10)

history_area = ctk.CTkTextbox(frame, height=100, width=300, font=("Arial", 12))
history_area.pack(side="right", padx=10)

waveform_label = ctk.CTkLabel(main_tab, text="")
waveform_label.pack(pady=10)

listen_button = ctk.CTkButton(main_tab, text="Kuuntele", command=start_listening, font=("Arial", 14))
listen_button.pack(pady=10)

# Database tab
db_tab = tabview.add("Tietokanta")
db_label = ctk.CTkLabel(db_tab, text="Tietokannan sisältö", font=("Arial", 16))
db_label.pack(pady=10)

db_area = ctk.CTkTextbox(db_tab, height=150, width=600, font=("Arial", 12))
db_area.pack(pady=10)

view_db_button = ctk.CTkButton(db_tab, text="Päivitä tiedot", command=view_database, font=("Arial", 14))
view_db_button.pack(pady=5)

# Rule management
rule_frame = ctk.CTkFrame(db_tab)
rule_frame.pack(pady=10, fill="x")

# Add rule
add_rule_frame = ctk.CTkFrame(rule_frame)
add_rule_frame.pack(pady=5, fill="x")

intent_label = ctk.CTkLabel(add_rule_frame, text="Intentti:", font=("Arial", 12))
intent_label.pack(side="left", padx=5)
intent_entry = ctk.CTkEntry(add_rule_frame, width=150)
intent_entry.pack(side="left", padx=5)

keyword_label = ctk.CTkLabel(add_rule_frame, text="Avainsana:", font=("Arial", 12))
keyword_label.pack(side="left", padx=5)
keyword_entry = ctk.CTkEntry(add_rule_frame, width=150)
keyword_entry.pack(side="left", padx=5)

weight_label = ctk.CTkLabel(add_rule_frame, text="Paino:", font=("Arial", 12))
weight_label.pack(side="left", padx=5)
weight_entry = ctk.CTkEntry(add_rule_frame, width=100)
weight_entry.pack(side="left", padx=5)

add_rule_button = ctk.CTkButton(add_rule_frame, text="Lisää sääntö", command=add_custom_rule, font=("Arial", 12))
add_rule_button.pack(side="left", padx=5)

# Rule list and modification
rule_list_frame = ctk.CTkFrame(rule_frame)
rule_list_frame.pack(pady=5, fill="x")

rule_listbox = ctk.CTkListbox(rule_list_frame, height=100, width=600, font=("Arial", 12))
rule_listbox.pack(side="left", padx=5)

# Alter rule
alter_rule_frame = ctk.CTkFrame(rule_frame)
alter_rule_frame.pack(pady=5, fill="x")

alter_intent_label = ctk.CTkLabel(alter_rule_frame, text="Uusi Intentti:", font=("Arial", 12))
alter_intent_label.pack(side="left", padx=5)
alter_intent_entry = ctk.CTkEntry(alter_rule_frame, width=150)
alter_intent_entry.pack(side="left", padx=5)

alter_keyword_label = ctk.CTkLabel(alter_rule_frame, text="Uusi Avainsana:", font=("Arial", 12))
alter_keyword_label.pack(side="left", padx=5)
alter_keyword_entry = ctk.CTkEntry(alter_rule_frame, width=150)
alter_keyword_entry.pack(side="left", padx=5)

alter_weight_label = ctk.CTkLabel(alter_rule_frame, text="Uusi Paino:", font=("Arial", 12))
alter_weight_label.pack(side="left", padx=5)
alter_weight_entry = ctk.CTkEntry(alter_rule_frame, width=100)
alter_weight_entry.pack(side="left", padx=5)

alter_rule_button = ctk.CTkButton(alter_rule_frame, text="Muuta sääntö", command=alter_selected_rule, font=("Arial", 12))
alter_rule_button.pack(side="left", padx=5)

remove_rule_button = ctk.CTkButton(rule_frame, text="Poista valittu sääntö", command=remove_selected_rule, font=("Arial", 12))
remove_rule_button.pack(pady=5)

status_label = ctk.CTkLabel(root, text="Valmis", font=("Arial", 12))
status_label.pack(pady=10)

# Alusta tietokanta
init_database()

# Käynnistä GUI-päivitykset
root.after(100, update_gui)

def main():
    print("Puheentunnistus- ja ymmärrysohjelmisto käynnistyy...")
    root.mainloop()

if __name__ == "__main__":
    main()
