# Vanha pokeri peli.
# Virhe löytyy mutta sitä en löydä.

import random
import tkinter as tk
from enum import Enum
from tkinter import messagebox

# Määritellään korttien maat ja arvot
MAAT = ['Hertta', 'Risti', 'Ruutu', 'Pata']
ARVOT = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jätkä', 'Kuningatar', 'Kuningas', 'Ässä']

# Määritellään käsien arvojärjestys
class KasiArvo(Enum):
    SUURI_KORTTI = 1
    PARI = 2
    KAKSI_PARIA = 3
    KOLMOSET = 4
    SUORA = 5
    VÄRI = 6
    TÄYSKÄSI = 7
    NELJÄ_SAMAA = 8
    KUNINKAALLINEN_VÄRI = 9

# Kortti-luokka
class Kortti:
    def __init__(self, arvo, maa):
        self.arvo = arvo
        self.maa = maa
    
    def __str__(self):
        return f"{self.arvo} {self.maa}"

# Pakka-luokka
class Pakka:
    def __init__(self):
        self.kortit = [Kortti(arvo, maa) for maa in MAAT for arvo in ARVOT]
        random.shuffle(self.kortit)
    
    def jaa(self, lkm):
        return [self.kortit.pop() for _ in range(lkm)]

# Pelaaja-luokka
class Pelaaja:
    def __init__(self, nimi, pelimerkit=1000):
        self.nimi = nimi
        self.pelimerkit = pelimerkit
        self.kasi = []
        self.nykyinen_panos = 0
    
    def panosta(self, maara):
        if maara <= self.pelimerkit:
            self.pelimerkit -= maara
            self.nykyinen_panos += maara
            return maara
        return 0

# Arvioi pokerikäsi
def arvioi_kasi(kasi, yhteiset_kortit):
    kaikki_kortit = kasi + yhteiset_kortit
    paras_arvo = KasiArvo.SUURI_KORTTI
    arvo_arvot = {'2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
                   'Jätkä': 11, 'Kuningatar': 12, 'Kuningas': 13, 'Ässä': 14}
    
    arvot = [kortti.arvo for kortti in kaikki_kortit]
    maat = [kortti.maa for kortti in kaikki_kortit]
    arvo_laskuri = {arvo: arvot.count(arvo) for arvo in arvot}
    maa_laskuri = {maa: maat.count(maa) for maa in maat}
    
    on_vari = max(maa_laskuri.values()) >= 5
    arvo_numerot = sorted([arvo_arvot[a] for a in arvot], reverse=True)
    on_suora = False
    uniikit_arvot = sorted(set(arvo_numerot), reverse=True)
    for i in range(len(uniikit_arvot) - 4):
        if uniikit_arvot[i] - uniikit_arvot[i + 4] == 4:
            on_suora = True
            break
    if set([14, 2, 3, 4, 5]).issubset(set(arvo_numerot)):
        on_suora = True
    
    if on_vari and on_suora and max(uniikit_arvot) == 14:
        return KasiArvo.KUNINKAALLINEN_VÄRI, arvo_numerot
    if on_vari and on_suora:
        return KasiArvo.SUORA, arvo_numerot
    if max(arvo_laskuri.values()) == 4:
        return KasiArvo.NELJÄ_SAMAA, arvo_numerot
    if max(arvo_laskuri.values()) == 3 and 2 in arvo_laskuri.values():
        return KasiArvo.TÄYSKÄSI, arvo_numerot
    if on_vari:
        return KasiArvo.VÄRI, arvo_numerot
    if on_suora:
        return KasiArvo.SUORA, arvo_numerot
    if max(arvo_laskuri.values()) == 3:
        return KasiArvo.KOLMOSET, arvo_numerot
    parit = sum(1 for lkm in arvo_laskuri.values() if lkm == 2)
    if parit == 2:
        return KasiArvo.KAKSI_PARIA, arvo_numerot
    if parit == 1:
        return KasiArvo.PARI, arvo_numerot
    return KasiArvo.SUURI_KORTTI, arvo_numerot

# Vertaa käsiä voittajan selvittämiseksi
def vertaa_kasia(pelaaja1, kasi1, pelaaja2, kasi2, yhteiset_kortit):
    arvo1, numerot1 = arvioi_kasi(kasi1, yhteiset_kortit)
    arvo2, numerot2 = arvioi_kasi(kasi2, yhteiset_kortit)
    
    if arvo1.value > arvo2.value:
        return pelaaja1
    elif arvo2.value > arvo1.value:
        return pelaaja2
    else:
        for n1, n2 in zip(numerot1, numerot2):
            if n1 > n2:
                return pelaaja1
            elif n2 > n1:
                return pelaaja2
        return None  # Tasapeli

# GUI-peli
class Pokeripeli:
    def __init__(self, root):
        self.root = root
        self.root.title("Texas Hold'em - Pokeri")
        self.pelaaja1 = Pelaaja("Pelaaja 1")
        self.pelaaja2 = Pelaaja("Pelaaja 2")
        self.potti = 0
        self.pakka = None
        self.yhteiset_kortit = []
        
        # GUI-elementit
        self.luo_gui()
        self.aloita_peli()
    
    def luo_gui(self):
        # Pelaaja 1
        self.p1_frame = tk.Frame(self.root)
        self.p1_frame.pack(pady=10)
        self.p1_nimi = tk.Label(self.p1_frame, text="Pelaaja 1", font=("Arial", 14))
        self.p1_nimi.pack()
        self.p1_kasi = tk.Label(self.p1_frame, text="", font=("Arial", 12))
        self.p1_kasi.pack()
        self.p1_pelimerkit = tk.Label(self.p1_frame, text=f"Pelimerkit: {self.pelaaja1.pelimerkit}", font=("Arial", 12))
        self.p1_pelimerkit.pack()
        
        # Yhteiset kortit
        self.yhteiset_frame = tk.Frame(self.root)
        self.yhteiset_frame.pack(pady=10)
        self.yhteiset_teksti = tk.Label(self.yhteiset_frame, text="Yhteiset kortit:", font=("Arial", 14))
        self.yhteiset_teksti.pack()
        self.yhteiset_kortit_label = tk.Label(self.yhteiset_frame, text="", font=("Arial", 12))
        self.yhteiset_kortit_label.pack()
        self.potti_label = tk.Label(self.yhteiset_frame, text="Potti: 0", font=("Arial", 12))
        self.potti_label.pack()
        
        # Pelaaja 2
        self.p2_frame = tk.Frame(self.root)
        self.p2_frame.pack(pady=10)
        self.p2_nimi = tk.Label(self.p2_frame, text="Pelaaja 2", font=("Arial", 14))
        self.p2_nimi.pack()
        self.p2_kasi = tk.Label(self.p2_frame, text="[Piilotettu]", font=("Arial", 12))
        self.p2_kasi.pack()
        self.p2_pelimerkit = tk.Label(self.p2_frame, text=f"Pelimerkit: {self.pelaaja2.pelimerkit}", font=("Arial", 12))
        self.p2_pelimerkit.pack()
        
        # Panostus
        self.panostus_frame = tk.Frame(self.root)
        self.panostus_frame.pack(pady=10)
        self.panostus_teksti = tk.Label(self.panostus_frame, text="Pelaaja 1:n panos:", font=("Arial", 12))
        self.panostus_teksti.pack(side=tk.LEFT)
        self.panostus_syote = tk.Entry(self.panostus_frame, width=10)
        self.panostus_syote.pack(side=tk.LEFT)
        self.panosta_btn = tk.Button(self.panostus_frame, text="Panosta", command=self.panosta_p1)
        self.panosta_btn.pack(side=tk.LEFT, padx=5)
        self.tarkista_btn = tk.Button(self.panostus_frame, text="Tarkista", command=self.tarkista_p1)
        self.tarkista_btn.pack(side=tk.LEFT)
        
        # Uusi peli
        self.uusi_peli_btn = tk.Button(self.root, text="Uusi peli", command=self.aloita_peli)
        self.uusi_peli_btn.pack(pady=10)
    
    def aloita_peli(self):
        self.pakka = Pakka()
        self.potti = 0
        self.pelaaja1.kasi = self.pakka.jaa(2)
        self.pelaaja2.kasi = self.pakka.jaa(2)
        self.yhteiset_kortit = self.pakka.jaa(5)
        self.pelaaja1.nykyinen_panos = 0
        self.pelaaja2.nykyinen_panos = 0
        
        # Sokkopanokset
        pieni_sokko = 10
        suuri_sokko = 20
        self.potti += self.pelaaja1.panosta(pieni_sokko)
        self.potti += self.pelaaja2.panosta(suuri_sokko)
        
        # Päivitä GUI
        self.p1_kasi.config(text=f"Käsi: {[str(kortti) for kortti in self.pelaaja1.kasi]}")
        self.p2_kasi.config(text="[Piilotettu]")
        self.yhteiset_kortit_label.config(text=f"{[str(kortti) for kortti in self.yhteiset_kortit]}")
        self.potti_label.config(text=f"Potti: {self.potti}")
        self.p1_pelimerkit.config(text=f"Pelimerkit: {self.pelaaja1.pelimerkit}")
        self.p2_pelimerkit.config(text=f"Pelimerkit: {self.pelaaja2.pelimerkit}")
        self.panostus_teksti.config(text="Pelaaja 1:n panos:")
        self.panosta_btn.config(state="normal")
        self.tarkista_btn.config(state="normal")
        self.panostus_syote.delete(0, tk.END)
    
    def panosta_p1(self):
        try:
            panos = int(self.panostus_syote.get())
            if panos > 0:
                self.potti += self.pelaaja1.panosta(panos)
                self.p1_pelimerkit.config(text=f"Pelimerkit: {self.pelaaja1.pelimerkit}")
                self.potti_label.config(text=f"Potti: {self.potti}")
                self.panostus_teksti.config(text="Pelaaja 2:n panos:")
                self.panosta_btn.config(command=self.panosta_p2)
                self.tarkista_btn.config(command=self.tarkista_p2)
                self.panostus_syote.delete(0, tk.END)
        except ValueError:
            messagebox.showerror("Virhe", "Syötä kelvollinen numero!")
    
    def tarkista_p1(self):
        self.panostus_teksti.config(text="Pelaaja 2:n panos:")
        self.panosta_btn.config(command=self.panosta_p2)
        self.tarkista_btn.config(command=self.tarkista_p2)
        self.panostus_syote.delete(0, tk.END)
    
    def panosta_p2(self):
        try:
            panos = int(self.panostus_syote.get())
            if panos > 0:
                self.potti += self.pelaaja2.panosta(panos)
                self.p2_pelimerkit.config(text=f"Pelimerkit: {self.pelaaja2.pelimerkit}")
                self.potti_label.config(text=f"Potti: {self.potti}")
                self.nayta_tulokset()
        except ValueError:
            messagebox.showerror("Virhe", "Syötä kelvollinen numero!")
    
    def tarkista_p2(self):
        self.nayta_tulokset()
    
    def nayta_tulokset(self):
        self.p2_kasi.config(text=f"Käsi: {[str(kortti) for kortti in self.pelaaja2.kasi]}")
        voittaja = vertaa_kasia(self.pelaaja1, self.pelaaja1.kasi, self.pelaaja2, self.pelaaja2.kasi, self.yhteiset_kortit)
        
        if voittaja:
            viesti = f"{voittaja.nimi} voittaa potin ({self.potti} pelimerkkiä)!"
            voittaja.pelimerkit += self.potti
        else:
            viesti = "Tasapeli! Potti jaetaan."
            self.pelaaja1.pelimerkit += self.potti // 2
            self.pelaaja2.pelimerkit += self.potti // 2
        
        self.p1_pelimerkit.config(text=f"Pelimerkit: {self.pelaaja1.pelimerkit}")
        self.p2_pelimerkit.config(text=f"Pelimerkit: {self.pelaaja2.pelimerkit}")
        self.panosta_btn.config(state="disabled")
        self.tarkista_btn.config(state="disabled")
        messagebox.showinfo("Tulos", viesti)

if __name__ == "__main__":
    root = tk.Tk()
    peli = Pokeripeli(root)
    root.mainloop()
