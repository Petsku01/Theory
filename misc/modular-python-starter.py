"""
================================================================================
MODULAARINEN PYTHON WEB-PROJEKTI - STARTER KIT
================================================================================

Tämä on suunniteltu niin, että voit:
1. Kopioida vain ne osat joita tarvitset
2. Vaihtaa minkä tahansa komponentin toiseen (esim. Flask -> FastAPI)
3. Aloittaa yksinkertaisesti ja laajentaa tarvittaessa
4. Ymmärtää jokaisen rivin tarkoituksen

Projektin rakenne:
------------------
projekti/
├── config.py          # KAIKKI asetukset yhdessä paikassa
├── database.py        # Tietokantayhteydet (vaihda SQLite -> PostgreSQL helposti)
├── models.py          # Tietomallit (lisää omasi tänne)
├── services.py        # Bisneslogiikka (omat säännöt tänne)
├── api.py            # API-reitit (lisää omat endpointit)
├── utils.py          # Apufunktiot (uudelleenkäytettävät)
└── main.py           # Käynnistystiedosto

================================================================================
"""

# ==============================================================================
# VAIHE 1: KONFIGURAATIO (config.py)
# ==============================================================================
# Kaikki asetukset yhdessä paikassa - helppo muuttaa
# ==============================================================================

import os
from dataclasses import dataclass
from typing import Optional
from enum import Enum

class Ymparisto(Enum):
    """Eri ympäristöt - lisää omasi tarvittaessa"""
    KEHITYS = "kehitys"
    TESTI = "testi"  
    TUOTANTO = "tuotanto"

@dataclass
class Asetukset:
    """
    KAIKKI projektin asetukset yhdessä paikassa.
    Muokkaa näitä vastaamaan omaa projektiasi.
    """
    
    # === PERUSASETUKSET ===
    # Nämä todennäköisesti haluat pitää
    sovelluksen_nimi: str = "OmaProjekti"
    versio: str = "1.0.0"
    ymparisto: Ymparisto = Ymparisto.KEHITYS
    debug: bool = True  # Aseta False tuotannossa
    
    # === PALVELIN ===
    # Missä osoitteessa sovellus pyörii
    host: str = "127.0.0.1"  # localhost kehityksessä
    portti: int = 5000
    
    # === TIETOKANTA ===
    # Vaihda tämä omaan tietokantaasi
    # SQLite (helppo aloitus):
    tietokanta_url: str = "sqlite:///projekti.db"
    # PostgreSQL (tuotanto):
    # tietokanta_url: str = "postgresql://user:pass@localhost/dbname"
    # MySQL:
    # tietokanta_url: str = "mysql://user:pass@localhost/dbname"
    
    # === SALAISUUDET ===
    # VAIHDA NÄMÄ OMIIN ARVOIHIN!
    salainen_avain: str = "VAIHDA-TAMA-OMAAN-SALAISEEN-AVAIMEEN"
    jwt_avain: str = "VAIHDA-TAMA-OMAAN-JWT-AVAIMEEN"
    
    # === VÄLIMUISTI (Cache) ===
    # Ota käyttöön jos tarvitset
    redis_kaytossa: bool = False
    redis_url: str = "redis://localhost:6379/0"
    valimuisti_kesto: int = 300  # sekuntia
    
    # === RAJAT ===
    # Suojaa liian monilta pyynnöiltä
    max_pyyntoja_tunnissa: int = 100
    max_tiedostokoko_mb: int = 10
    
    # === SÄHKÖPOSTI ===
    # Täytä jos tarvitset sähköpostia
    smtp_palvelin: Optional[str] = None
    smtp_portti: int = 587
    smtp_kayttaja: Optional[str] = None
    smtp_salasana: Optional[str] = None
    
    # === OMAT ASETUKSET ===
    # Lisää tähän omat projektisi asetukset
    oma_asetus_1: str = "arvo1"
    oma_asetus_2: int = 42
    
    @classmethod
    def lataa_ymparistosta(cls):
        """
        Lataa asetukset ympäristömuuttujista.
        Käyttö: asetukset = Asetukset.lataa_ymparistosta()
        """
        return cls(
            sovelluksen_nimi=os.getenv("SOVELLUKSEN_NIMI", cls.sovelluksen_nimi),
            versio=os.getenv("VERSIO", cls.versio),
            ymparisto=Ymparisto(os.getenv("YMPARISTO", "kehitys")),
            debug=os.getenv("DEBUG", "true").lower() == "true",
            host=os.getenv("HOST", cls.host),
            portti=int(os.getenv("PORTTI", cls.portti)),
            tietokanta_url=os.getenv("TIETOKANTA_URL", cls.tietokanta_url),
            salainen_avain=os.getenv("SALAINEN_AVAIN", cls.salainen_avain),
            jwt_avain=os.getenv("JWT_AVAIN", cls.jwt_avain),
        )

# Globaali asetusinstanssi - käytä tätä kaikkialla
asetukset = Asetukset.lataa_ymparistosta()


# ==============================================================================
# VAIHE 2: TIETOKANTA (database.py)
# ==============================================================================
# Tietokantayhteydet - helppo vaihtaa toiseen tietokantaan
# ==============================================================================

from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from contextlib import contextmanager
from datetime import datetime
import logging

# Luo logger debuggausta varten
logger = logging.getLogger(__name__)

# Tietokantamallien pohja - kaikki mallit perivät tämän
Base = declarative_base()

class TietokantaYhteys:
    """
    Hallitsee tietokantayhteyksiä.
    Vaihda vain tietokanta_url asetuksissa käyttääksesi eri tietokantaa.
    """
    
    def __init__(self, tietokanta_url: str = None):
        """
        Alustaa tietokantayhteyden.
        
        Args:
            tietokanta_url: Tietokannan osoite (esim. "sqlite:///data.db")
        """
        self.tietokanta_url = tietokanta_url or asetukset.tietokanta_url
        
        # Luo moottori (engine) - tämä hoitaa yhteydet
        self.moottori = create_engine(
            self.tietokanta_url,
            # SQLite-spesifi asetus, poista jos käytät muuta
            connect_args={"check_same_thread": False} if "sqlite" in self.tietokanta_url else {},
            # Näytä SQL-kyselyt konsolissa debug-tilassa
            echo=asetukset.debug
        )
        
        # Luo sessio-tehdas
        self.SessionLocal = sessionmaker(
            autocommit=False,  # Älä commitoi automaattisesti
            autoflush=False,   # Älä flushaa automaattisesti
            bind=self.moottori
        )
    
    def luo_taulut(self):
        """
        Luo kaikki taulut tietokantaan.
        Kutsu tämä kerran sovelluksen alussa.
        """
        logger.info(f"Luodaan taulut tietokantaan: {self.tietokanta_url}")
        Base.metadata.create_all(bind=self.moottori)
        logger.info("Taulut luotu onnistuneesti")
    
    def pudota_taulut(self):
        """
        Poistaa kaikki taulut. VAROITUS: Poistaa kaiken datan!
        Käytä vain testauksessa.
        """
        logger.warning("VAROITUS: Poistetaan kaikki taulut!")
        Base.metadata.drop_all(bind=self.moottori)
    
    @contextmanager
    def hae_sessio(self):
        """
        Kontekstinhallitsija tietokantasessiolle.
        Hoitaa automaattisesti commitin ja rollbackin.
        
        Käyttö:
            with tietokanta.hae_sessio() as sessio:
                # Tee tietokantaoperaatiot
                sessio.add(uusi_objekti)
        """
        sessio = self.SessionLocal()
        try:
            yield sessio
            sessio.commit()  # Tallenna muutokset
            logger.debug("Tietokantamuutokset tallennettu")
        except Exception as e:
            sessio.rollback()  # Peru muutokset virhetilanteessa
            logger.error(f"Tietokantavirhe: {e}")
            raise
        finally:
            sessio.close()  # Sulje sessio aina

# Luo globaali tietokantainstanssi
tietokanta = TietokantaYhteys()


# ==============================================================================
# VAIHE 3: TIETOMALLIT (models.py)
# ==============================================================================
# Määrittele tietokantasi taulut tässä
# ==============================================================================

from sqlalchemy import ForeignKey, Index
from sqlalchemy.orm import relationship, validates
import re
from typing import Optional

class Aikaleima:
    """
    Yhteinen pohja kaikille malleille - lisää automaattiset aikakentät.
    Kaikki mallit voivat periä tämän saadakseen luotu/päivitetty -kentät.
    """
    luotu = Column(DateTime, default=datetime.utcnow, nullable=False)
    paivitetty = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        """Tulosta mallin nimi ja ID debuggausta varten"""
        return f"<{self.__class__.__name__}(id={getattr(self, 'id', 'ei-id')})>"


class Kayttaja(Base, Aikaleima):
    """
    Käyttäjämalli - muokkaa kenttiä tarpeen mukaan.
    
    Vinkkejä muokkaamiseen:
    - Lisää kenttiä: puhelinnumero = Column(String(20))
    - Poista kenttiä: Kommentoi pois mitä et tarvitse
    - Muuta tyyppejä: String(100) -> String(200) pidemmille teksteille
    """
    __tablename__ = "kayttajat"  # Taulun nimi tietokannassa
    
    # === PERUSKENTÄT ===
    id = Column(Integer, primary_key=True)
    sahkoposti = Column(String(255), unique=True, nullable=False, index=True)
    kayttajanimi = Column(String(100), unique=True, nullable=False)
    salasana_hash = Column(String(255), nullable=False)  # Älä tallenna salasanaa selväkielisenä!
    
    # === PROFIILITIEDOT ===
    # Kommentoi pois mitä et tarvitse
    etunimi = Column(String(100))
    sukunimi = Column(String(100))
    kuvaus = Column(Text)
    kuva_url = Column(String(500))
    
    # === TILAKENTÄT ===
    on_aktiivinen = Column(Boolean, default=True)
    on_vahvistettu = Column(Boolean, default=False)
    viimeisin_kirjautuminen = Column(DateTime)
    
    # === SUHTEET MUIHIN TAULUIHIN ===
    # Käyttäjällä voi olla monta kohdetta
    kohteet = relationship("Kohde", back_populates="kayttaja", lazy="dynamic")
    
    # === OMAT KENTÄT ===
    # Lisää tähän projektisi tarvitsemat kentät
    # esim: yritys = Column(String(200))
    # esim: osasto = Column(String(100))
    
    @validates('sahkoposti')
    def validoi_sahkoposti(self, key, sahkoposti):
        """
        Tarkistaa että sähköposti on oikeaa muotoa.
        Muokkaa regex-kaavaa tarpeen mukaan.
        """
        kaava = r'^[\w\.-]+@[\w\.-]+\.\w+$'
        if not re.match(kaava, sahkoposti):
            raise ValueError(f"Virheellinen sähköposti: {sahkoposti}")
        return sahkoposti.lower()  # Tallenna aina pienenä
    
    def aseta_salasana(self, salasana: str):
        """
        Asettaa salasanan (hashattuna).
        Käytä AINA tätä, älä aseta salasana_hash kenttää suoraan!
        """
        from werkzeug.security import generate_password_hash
        self.salasana_hash = generate_password_hash(salasana)
    
    def tarkista_salasana(self, salasana: str) -> bool:
        """Tarkistaa onko annettu salasana oikea"""
        from werkzeug.security import check_password_hash
        return check_password_hash(self.salasana_hash, salasana)
    
    def to_dict(self, sisallyta_salaiset=False):
        """
        Muuttaa mallin sanakirjaksi (JSON-vastauksia varten).
        
        Args:
            sisallyta_salaiset: Sisällytä salaiset kentät (älä käytä API:ssa!)
        """
        data = {
            "id": self.id,
            "sahkoposti": self.sahkoposti,
            "kayttajanimi": self.kayttajanimi,
            "etunimi": self.etunimi,
            "sukunimi": self.sukunimi,
            "on_aktiivinen": self.on_aktiivinen,
            "on_vahvistettu": self.on_vahvistettu,
            "luotu": self.luotu.isoformat() if self.luotu else None,
        }
        
        if sisallyta_salaiset:
            data["viimeisin_kirjautuminen"] = self.viimeisin_kirjautuminen.isoformat() if self.viimeisin_kirjautuminen else None
        
        return data


class Kohde(Base, Aikaleima):
    """
    Esimerkkimalli - korvaa omalla datamallillasi.
    
    Tämä voisi olla esim:
    - Tuote (verkkokauppa)
    - Artikkeli (blogi)
    - Tehtävä (todo-sovellus)
    - Viesti (chat-sovellus)
    """
    __tablename__ = "kohteet"
    
    # === PERUSKENTÄT ===
    id = Column(Integer, primary_key=True)
    otsikko = Column(String(255), nullable=False)
    sisalto = Column(Text)
    
    # === METATIEDOT ===
    kategoria = Column(String(100), default="yleinen")
    tila = Column(String(50), default="luonnos")  # luonnos, julkaistu, arkistoitu
    prioriteetti = Column(Integer, default=0)
    
    # === VIITTAUKSET ===
    kayttaja_id = Column(Integer, ForeignKey("kayttajat.id"), nullable=False)
    kayttaja = relationship("Kayttaja", back_populates="kohteet")
    
    # === OMAT KENTÄT ===
    # Lisää projektikohtaiset kentät tähän
    # esim: hinta = Column(Float)
    # esim: maara = Column(Integer)
    # esim: julkaisuaika = Column(DateTime)
    
    @validates('tila')
    def validoi_tila(self, key, tila):
        """Varmistaa että tila on sallittu arvo"""
        sallitut_tilat = ['luonnos', 'julkaistu', 'arkistoitu']
        if tila not in sallitut_tilat:
            raise ValueError(f"Tila täytyy olla: {', '.join(sallitut_tilat)}")
        return tila
    
    def to_dict(self):
        """Muuttaa kohteen sanakirjaksi API-vastauksia varten"""
        return {
            "id": self.id,
            "otsikko": self.otsikko,
            "sisalto": self.sisalto,
            "kategoria": self.kategoria,
            "tila": self.tila,
            "prioriteetti": self.prioriteetti,
            "kayttaja_id": self.kayttaja_id,
            "kayttaja": self.kayttaja.kayttajanimi if self.kayttaja else None,
            "luotu": self.luotu.isoformat() if self.luotu else None,
            "paivitetty": self.paivitetty.isoformat() if self.paivitetty else None,
        }


# ==============================================================================
# VAIHE 4: BISNESLOGIIKKA (services.py)
# ==============================================================================
# Kaikki monimutkaisempi logiikka tänne - pidä se erillään API:sta
# ==============================================================================

from typing import List, Dict, Any
import hashlib
import secrets
from datetime import timedelta

class KayttajaService:
    """
    Käsittelee käyttäjiin liittyvän logiikan.
    Lisää omat metodit tarpeen mukaan.
    """
    
    def __init__(self, sessio: Session = None):
        """
        Args:
            sessio: Tietokantasessio (jos None, luo uusi)
        """
        self.sessio = sessio
    
    def luo_kayttaja(
        self, 
        sahkoposti: str, 
        kayttajanimi: str, 
        salasana: str,
        **muut_tiedot
    ) -> Kayttaja:
        """
        Luo uuden käyttäjän.
        
        Args:
            sahkoposti: Käyttäjän sähköposti
            kayttajanimi: Uniikki käyttäjänimi
            salasana: Salasana (hashataan automaattisesti)
            **muut_tiedot: Muut vapaaehtoiset kentät (etunimi, sukunimi, jne)
        
        Returns:
            Luotu käyttäjä
        
        Raises:
            ValueError: Jos käyttäjänimi tai sähköposti on jo käytössä
        """
        # Tarkista onko käyttäjä jo olemassa
        if self.sessio.query(Kayttaja).filter_by(sahkoposti=sahkoposti).first():
            raise ValueError(f"Sähköposti {sahkoposti} on jo käytössä")
        
        if self.sessio.query(Kayttaja).filter_by(kayttajanimi=kayttajanimi).first():
            raise ValueError(f"Käyttäjänimi {kayttajanimi} on jo käytössä")
        
        # Luo uusi käyttäjä
        kayttaja = Kayttaja(
            sahkoposti=sahkoposti,
            kayttajanimi=kayttajanimi,
            **muut_tiedot
        )
        kayttaja.aseta_salasana(salasana)
        
        # Tallenna tietokantaan
        self.sessio.add(kayttaja)
        
        logger.info(f"Luotiin uusi käyttäjä: {kayttajanimi}")
        return kayttaja
    
    def kirjaudu(self, tunniste: str, salasana: str) -> Optional[Kayttaja]:
        """
        Kirjautuminen sähköpostilla tai käyttäjänimellä.
        
        Args:
            tunniste: Sähköposti tai käyttäjänimi
            salasana: Salasana
        
        Returns:
            Käyttäjä jos kirjautuminen onnistui, None muuten
        """
        # Etsi käyttäjä
        kayttaja = self.sessio.query(Kayttaja).filter(
            (Kayttaja.sahkoposti == tunniste) | 
            (Kayttaja.kayttajanimi == tunniste)
        ).first()
        
        if not kayttaja:
            logger.warning(f"Kirjautumisyritys tuntemattomalla tunnuksella: {tunniste}")
            return None
        
        # Tarkista salasana
        if not kayttaja.tarkista_salasana(salasana):
            logger.warning(f"Väärä salasana käyttäjälle: {tunniste}")
            return None
        
        # Tarkista onko tili aktiivinen
        if not kayttaja.on_aktiivinen:
            logger.warning(f"Kirjautumisyritys ei-aktiiviselle tilille: {tunniste}")
            return None
        
        # Päivitä viimeisin kirjautuminen
        kayttaja.viimeisin_kirjautuminen = datetime.utcnow()
        
        logger.info(f"Käyttäjä kirjautui: {kayttaja.kayttajanimi}")
        return kayttaja
    
    def hae_kayttaja(self, kayttaja_id: int) -> Optional[Kayttaja]:
        """Hakee käyttäjän ID:llä"""
        return self.sessio.query(Kayttaja).filter_by(id=kayttaja_id).first()
    
    def paivita_kayttaja(self, kayttaja_id: int, **paivitykset) -> Kayttaja:
        """
        Päivittää käyttäjän tiedot.
        
        Args:
            kayttaja_id: Käyttäjän ID
            **paivitykset: Päivitettävät kentät ja arvot
        
        Returns:
            Päivitetty käyttäjä
        """
        kayttaja = self.hae_kayttaja(kayttaja_id)
        if not kayttaja:
            raise ValueError(f"Käyttäjää {kayttaja_id} ei löydy")
        
        # Päivitä kentät
        for kentta, arvo in paivitykset.items():
            if hasattr(kayttaja, kentta):
                setattr(kayttaja, kentta, arvo)
        
        logger.info(f"Päivitettiin käyttäjä: {kayttaja.kayttajanimi}")
        return kayttaja


class KohdeService:
    """
    Käsittelee kohteisiin liittyvän logiikan.
    Muokkaa vastaamaan omaa datamalliasi.
    """
    
    def __init__(self, sessio: Session = None):
        self.sessio = sessio
    
    def luo_kohde(
        self, 
        kayttaja_id: int,
        otsikko: str,
        sisalto: str = "",
        **muut_tiedot
    ) -> Kohde:
        """
        Luo uuden kohteen.
        
        Args:
            kayttaja_id: Kohteen omistajan ID
            otsikko: Kohteen otsikko
            sisalto: Kohteen sisältö
            **muut_tiedot: Muut vapaaehtoiset kentät
        
        Returns:
            Luotu kohde
        """
        # Validoi syötteet
        if len(otsikko) < 3:
            raise ValueError("Otsikon täytyy olla vähintään 3 merkkiä")
        
        # Luo kohde
        kohde = Kohde(
            kayttaja_id=kayttaja_id,
            otsikko=otsikko,
            sisalto=sisalto,
            **muut_tiedot
        )
        
        self.sessio.add(kohde)
        
        logger.info(f"Luotiin uusi kohde: {otsikko}")
        return kohde
    
    def hae_kayttajan_kohteet(
        self, 
        kayttaja_id: int,
        tila: Optional[str] = None,
        kategoria: Optional[str] = None
    ) -> List[Kohde]:
        """
        Hakee käyttäjän kohteet.
        
        Args:
            kayttaja_id: Käyttäjän ID
            tila: Suodata tilan mukaan (valinnainen)
            kategoria: Suodata kategorian mukaan (valinnainen)
        
        Returns:
            Lista kohteita
        """
        kysely = self.sessio.query(Kohde).filter_by(kayttaja_id=kayttaja_id)
        
        if tila:
            kysely = kysely.filter_by(tila=tila)
        
        if kategoria:
            kysely = kysely.filter_by(kategoria=kategoria)
        
        # Järjestä uusimmat ensin
        return kysely.order_by(Kohde.luotu.desc()).all()
    
    def paivita_kohde(
        self,
        kohde_id: int,
        kayttaja_id: int,
        **paivitykset
    ) -> Kohde:
        """
        Päivittää kohteen (vain omistaja voi päivittää).
        
        Args:
            kohde_id: Kohteen ID
            kayttaja_id: Pyytäjän käyttäjä ID
            **paivitykset: Päivitettävät kentät
        
        Returns:
            Päivitetty kohde
        
        Raises:
            ValueError: Jos kohdetta ei löydy
            PermissionError: Jos käyttäjä ei omista kohdetta
        """
        kohde = self.sessio.query(Kohde).filter_by(id=kohde_id).first()
        
        if not kohde:
            raise ValueError(f"Kohdetta {kohde_id} ei löydy")
        
        if kohde.kayttaja_id != kayttaja_id:
            raise PermissionError("Vain kohteen omistaja voi muokata sitä")
        
        # Päivitä kentät
        for kentta, arvo in paivitykset.items():
            if hasattr(kohde, kentta) and kentta not in ['id', 'kayttaja_id']:
                setattr(kohde, kentta, arvo)
        
        logger.info(f"Päivitettiin kohde: {kohde.otsikko}")
        return kohde
    
    def poista_kohde(self, kohde_id: int, kayttaja_id: int) -> bool:
        """
        Poistaa kohteen (vain omistaja voi poistaa).
        
        Returns:
            True jos poisto onnistui
        """
        kohde = self.sessio.query(Kohde).filter_by(id=kohde_id).first()
        
        if not kohde:
            raise ValueError(f"Kohdetta {kohde_id} ei löydy")
        
        if kohde.kayttaja_id != kayttaja_id:
            raise PermissionError("Vain kohteen omistaja voi poistaa sen")
        
        self.sessio.delete(kohde)
        
        logger.info(f"Poistettiin kohde: {kohde.otsikko}")
        return True


# ==============================================================================
# VAIHE 5: APUFUNKTIOT (utils.py)
# ==============================================================================
# Uudelleenkäytettävät funktiot
# ==============================================================================

import jwt
from functools import wraps
from flask import request, jsonify, g

class TokenManager:
    """
    JWT-tokenien hallinta.
    Käytä autentikaatioon.
    """
    
    @staticmethod
    def luo_token(kayttaja_id: int, kesto_tunteja: int = 24) -> str:
        """
        Luo JWT-token käyttäjälle.
        
        Args:
            kayttaja_id: Käyttäjän ID
            kesto_tunteja: Tokenin voimassaoloaika tunneissa
        
        Returns:
            JWT-token merkkijonona
        """
        payload = {
            'kayttaja_id': kayttaja_id,
            'exp': datetime.utcnow() + timedelta(hours=kesto_tunteja),
            'iat': datetime.utcnow()
        }
        
        token = jwt.encode(
            payload,
            asetukset.jwt_avain,
            algorithm='HS256'
        )
        
        logger.debug(f"Luotiin token käyttäjälle {kayttaja_id}")
        return token
    
    @staticmethod
    def validoi_token(token: str) -> Optional[int]:
        """
        Validoi JWT-token ja palauttaa käyttäjän ID:n.
        
        Args:
            token: JWT-token merkkijonona
        
        Returns:
            Käyttäjän ID jos token on validi, None muuten
        """
        try:
            payload = jwt.decode(
                token,
                asetukset.jwt_avain,
                algorithms=['HS256']
            )
            return payload.get('kayttaja_id')
        except jwt.ExpiredSignatureError:
            logger.warning("Token vanhentunut")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Virheellinen token: {e}")
            return None


def vaadi_kirjautuminen(f):
    """
    Decorator joka vaatii kirjautumisen.
    
    Käyttö:
        @app.route('/suojattu')
        @vaadi_kirjautuminen
        def suojattu_reitti():
            # g.kayttaja_id sisältää kirjautuneen käyttäjän ID:n
            return "Olet kirjautunut!"
    """
    @wraps(f)
    def koristeltu_funktio(*args, **kwargs):
        # Hae token headerista
        auth_header = request.headers.get('Authorization', '')
        
        if not auth_header.startswith('Bearer '):
            return jsonify({"virhe": "Token puuttuu"}), 401
        
        token = auth_header.replace('Bearer ', '')
        
        # Validoi token
        kayttaja_id = TokenManager.validoi_token(token)
        
        if not kayttaja_id:
            return jsonify({"virhe": "Virheellinen tai vanhentunut token"}), 401
        
        # Tallenna käyttäjä-ID globaaliin kontekstiin
        g.kayttaja_id = kayttaja_id
        
        return f(*args, **kwargs)
    
    return koristeltu_funktio


class Validaattori:
    """
    Apufunktioita syötteiden validointiin.
    Lisää omia validointeja tarpeen mukaan.
    """
    
    @staticmethod
    def validoi_sahkoposti(sahkoposti: str) -> bool:
        """Tarkistaa onko sähköposti validi"""
        kaava = r'^[\w\.-]+@[\w\.-]+\.\w+$'
        return bool(re.match(kaava, sahkoposti))
    
    @staticmethod
    def validoi_salasana(salasana: str) -> tuple[bool, str]:
        """
        Tarkistaa salasanan vahvuuden.
        
        Returns:
            (True/False, virheilmoitus)
        """
        if len(salasana) < 8:
            return False, "Salasanan täytyy olla vähintään 8 merkkiä"
        
        if not any(c.isupper() for c in salasana):
            return False, "Salasanassa täytyy olla iso kirjain"
        
        if not any(c.islower() for c in salasana):
            return False, "Salasanassa täytyy olla pieni kirjain"
        
        if not any(c.isdigit() for c in salasana):
            return False, "Salasanassa täytyy olla numero"
        
        return True, "OK"
    
    @staticmethod
    def validoi_kayttajanimi(kayttajanimi: str) -> tuple[bool, str]:
        """
        Tarkistaa käyttäjänimen.
        
        Returns:
            (True/False, virheilmoitus)
        """
        if len(kayttajanimi) < 3:
            return False, "Käyttäjänimen täytyy olla vähintään 3 merkkiä"
        
        if len(kayttajanimi) > 20:
            return False, "Käyttäjänimi saa olla max 20 merkkiä"
        
        if not kayttajanimi.replace('_', '').isalnum():
            return False, "Käyttäjänimi saa sisältää vain kirjaimia, numeroita ja _"
        
        return True, "OK"


# ==============================================================================
# VAIHE 6: API-REITIT (api.py)
# ==============================================================================
# Flask-sovellus ja HTTP-endpointit
# ==============================================================================

from flask import Flask, request, jsonify, g
from flask_cors import CORS
import logging

def luo_sovellus():
    """
    Luo ja konfiguroi Flask-sovellus.
    
    Returns:
        Konfiguroitu Flask-sovellus
    """
    
    # === ALUSTA FLASK ===
    app = Flask(__name__)
    app.config['SECRET_KEY'] = asetukset.salainen_avain
    
    # === SALLI CORS (tarvitaan jos frontend on eri portissa) ===
    CORS(app)
    
    # === LOKITUS ===
    if asetukset.debug:
        logging.basicConfig(
            level=logging.DEBUG,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
    
    # ===========================================================
    # MIDDLEWARE
    # ===========================================================
    
    @app.before_request
    def ennen_pyyntoa():
        """Suoritetaan ennen jokaista pyyntöä"""
        logger.debug(f"Pyyntö: {request.method} {request.path}")
    
    @app.after_request
    def pyynnon_jalkeen(response):
        """Suoritetaan jokaisen pyynnön jälkeen"""
        # Lisää CORS-headerit jos tarvitaan
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        return response
    
    @app.errorhandler(404)
    def ei_loytynyt(e):
        """Käsittele 404-virheet"""
        return jsonify({"virhe": "Reittiä ei löydy"}), 404
    
    @app.errorhandler(500)
    def palvelinvirhe(e):
        """Käsittele 500-virheet"""
        logger.error(f"Palvelinvirhe: {e}")
        return jsonify({"virhe": "Palvelinvirhe"}), 500
    
    # ===========================================================
    # JULKISET REITIT (ei vaadi kirjautumista)
    # ===========================================================
    
    @app.route('/')
    def etusivu():
        """Tervetuloviesti"""
        return jsonify({
            "viesti": f"Tervetuloa {asetukset.sovelluksen_nimi} API:in!",
            "versio": asetukset.versio,
            "dokumentaatio": "/api/docs"
        })
    
    @app.route('/terveys')
    def terveystarkistus():
        """
        Terveystarkistus-endpoint.
        Käytä tätä valvontaan (monitoring).
        """
        try:
            # Tarkista tietokantayhteys
            with tietokanta.hae_sessio() as sessio:
                sessio.execute("SELECT 1")
            
            return jsonify({
                "tila": "OK",
                "tietokanta": "Yhdistetty",
                "aika": datetime.utcnow().isoformat()
            })
        except Exception as e:
            return jsonify({
                "tila": "VIRHE",
                "virhe": str(e)
            }), 503
    
    @app.route('/api/rekisteroidy', methods=['POST'])
    def rekisteroidy():
        """
        Rekisteröi uusi käyttäjä.
        
        Body:
            {
                "sahkoposti": "nimi@esimerkki.fi",
                "kayttajanimi": "kayttaja123",
                "salasana": "Salasana123!",
                "etunimi": "Matti" (valinnainen),
                "sukunimi": "Meikäläinen" (valinnainen)
            }
        """
        try:
            data = request.get_json()
            
            # === VALIDOI SYÖTTEET ===
            if not data:
                return jsonify({"virhe": "Tyhjä pyyntö"}), 400
            
            # Pakolliset kentät
            pakolliset = ['sahkoposti', 'kayttajanimi', 'salasana']
            puuttuvat = [k for k in pakolliset if k not in data]
            if puuttuvat:
                return jsonify({"virhe": f"Puuttuvat kentät: {', '.join(puuttuvat)}"}), 400
            
            # Validoi sähköposti
            if not Validaattori.validoi_sahkoposti(data['sahkoposti']):
                return jsonify({"virhe": "Virheellinen sähköpostiosoite"}), 400
            
            # Validoi käyttäjänimi
            validi, viesti = Validaattori.validoi_kayttajanimi(data['kayttajanimi'])
            if not validi:
                return jsonify({"virhe": viesti}), 400
            
            # Validoi salasana
            validi, viesti = Validaattori.validoi_salasana(data['salasana'])
            if not validi:
                return jsonify({"virhe": viesti}), 400
            
            # === LUO KÄYTTÄJÄ ===
            with tietokanta.hae_sessio() as sessio:
                kayttaja_service = KayttajaService(sessio)
                
                kayttaja = kayttaja_service.luo_kayttaja(
                    sahkoposti=data['sahkoposti'],
                    kayttajanimi=data['kayttajanimi'],
                    salasana=data['salasana'],
                    etunimi=data.get('etunimi'),
                    sukunimi=data.get('sukunimi')
                )
                
                # Luo token
                token = TokenManager.luo_token(kayttaja.id)
                
                return jsonify({
                    "viesti": "Rekisteröinti onnistui!",
                    "kayttaja": kayttaja.to_dict(),
                    "token": token
                }), 201
                
        except ValueError as e:
            return jsonify({"virhe": str(e)}), 400
        except Exception as e:
            logger.error(f"Rekisteröinti epäonnistui: {e}")
            return jsonify({"virhe": "Rekisteröinti epäonnistui"}), 500
    
    @app.route('/api/kirjaudu', methods=['POST'])
    def kirjaudu():
        """
        Kirjaudu sisään.
        
        Body:
            {
                "tunniste": "sahkoposti@esimerkki.fi TAI kayttajanimi",
                "salasana": "Salasana123!"
            }
        """
        try:
            data = request.get_json()
            
            # Validoi syötteet
            if not data or 'tunniste' not in data or 'salasana' not in data:
                return jsonify({"virhe": "Tunniste ja salasana vaaditaan"}), 400
            
            # Yritä kirjautumista
            with tietokanta.hae_sessio() as sessio:
                kayttaja_service = KayttajaService(sessio)
                
                kayttaja = kayttaja_service.kirjaudu(
                    tunniste=data['tunniste'],
                    salasana=data['salasana']
                )
                
                if not kayttaja:
                    return jsonify({"virhe": "Väärä tunniste tai salasana"}), 401
                
                # Luo token
                token = TokenManager.luo_token(kayttaja.id)
                
                return jsonify({
                    "viesti": "Kirjautuminen onnistui!",
                    "kayttaja": kayttaja.to_dict(),
                    "token": token
                })
                
        except Exception as e:
            logger.error(f"Kirjautuminen epäonnistui: {e}")
            return jsonify({"virhe": "Kirjautuminen epäonnistui"}), 500
    
    # ===========================================================
    # SUOJATUT REITIT (vaatii kirjautumisen)
    # ===========================================================
    
    @app.route('/api/profiili')
    @vaadi_kirjautuminen
    def hae_profiili():
        """Hae kirjautuneen käyttäjän profiili"""
        try:
            with tietokanta.hae_sessio() as sessio:
                kayttaja_service = KayttajaService(sessio)
                kayttaja = kayttaja_service.hae_kayttaja(g.kayttaja_id)
                
                if not kayttaja:
                    return jsonify({"virhe": "Käyttäjää ei löydy"}), 404
                
                return jsonify(kayttaja.to_dict(sisallyta_salaiset=True))
                
        except Exception as e:
            logger.error(f"Profiilin haku epäonnistui: {e}")
            return jsonify({"virhe": "Profiilin haku epäonnistui"}), 500
    
    @app.route('/api/kohteet', methods=['GET'])
    @vaadi_kirjautuminen
    def hae_kohteet():
        """
        Hae kirjautuneen käyttäjän kohteet.
        
        Query parametrit:
            - tila: Suodata tilan mukaan (luonnos/julkaistu/arkistoitu)
            - kategoria: Suodata kategorian mukaan
        """
        try:
            # Hae suodattimet
            tila = request.args.get('tila')
            kategoria = request.args.get('kategoria')
            
            with tietokanta.hae_sessio() as sessio:
                kohde_service = KohdeService(sessio)
                
                kohteet = kohde_service.hae_kayttajan_kohteet(
                    kayttaja_id=g.kayttaja_id,
                    tila=tila,
                    kategoria=kategoria
                )
                
                return jsonify({
                    "kohteet": [k.to_dict() for k in kohteet],
                    "yhteensa": len(kohteet)
                })
                
        except Exception as e:
            logger.error(f"Kohteiden haku epäonnistui: {e}")
            return jsonify({"virhe": "Kohteiden haku epäonnistui"}), 500
    
    @app.route('/api/kohteet', methods=['POST'])
    @vaadi_kirjautuminen
    def luo_kohde():
        """
        Luo uusi kohde.
        
        Body:
            {
                "otsikko": "Kohteen otsikko",
                "sisalto": "Kohteen sisältö",
                "kategoria": "yleinen" (valinnainen),
                "tila": "luonnos" (valinnainen)
            }
        """
        try:
            data = request.get_json()
            
            # Validoi syötteet
            if not data or 'otsikko' not in data:
                return jsonify({"virhe": "Otsikko vaaditaan"}), 400
            
            with tietokanta.hae_sessio() as sessio:
                kohde_service = KohdeService(sessio)
                
                kohde = kohde_service.luo_kohde(
                    kayttaja_id=g.kayttaja_id,
                    otsikko=data['otsikko'],
                    sisalto=data.get('sisalto', ''),
                    kategoria=data.get('kategoria', 'yleinen'),
                    tila=data.get('tila', 'luonnos')
                )
                
                return jsonify({
                    "viesti": "Kohde luotu!",
                    "kohde": kohde.to_dict()
                }), 201
                
        except ValueError as e:
            return jsonify({"virhe": str(e)}), 400
        except Exception as e:
            logger.error(f"Kohteen luonti epäonnistui: {e}")
            return jsonify({"virhe": "Kohteen luonti epäonnistui"}), 500
    
    @app.route('/api/kohteet/<int:kohde_id>', methods=['PUT'])
    @vaadi_kirjautuminen
    def paivita_kohde(kohde_id):
        """
        Päivitä kohde.
        
        Body:
            {
                "otsikko": "Uusi otsikko" (valinnainen),
                "sisalto": "Uusi sisältö" (valinnainen),
                "tila": "julkaistu" (valinnainen),
                "kategoria": "uusi" (valinnainen)
            }
        """
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({"virhe": "Tyhjä pyyntö"}), 400
            
            with tietokanta.hae_sessio() as sessio:
                kohde_service = KohdeService(sessio)
                
                kohde = kohde_service.paivita_kohde(
                    kohde_id=kohde_id,
                    kayttaja_id=g.kayttaja_id,
                    **data
                )
                
                return jsonify({
                    "viesti": "Kohde päivitetty!",
                    "kohde": kohde.to_dict()
                })
                
        except ValueError as e:
            return jsonify({"virhe": str(e)}), 404
        except PermissionError as e:
            return jsonify({"virhe": str(e)}), 403
        except Exception as e:
            logger.error(f"Kohteen päivitys epäonnistui: {e}")
            return jsonify({"virhe": "Kohteen päivitys epäonnistui"}), 500
    
    @app.route('/api/kohteet/<int:kohde_id>', methods=['DELETE'])
    @vaadi_kirjautuminen
    def poista_kohde(kohde_id):
        """Poista kohde"""
        try:
            with tietokanta.hae_sessio() as sessio:
                kohde_service = KohdeService(sessio)
                
                kohde_service.poista_kohde(
                    kohde_id=kohde_id,
                    kayttaja_id=g.kayttaja_id
                )
                
                return jsonify({"viesti": "Kohde poistettu!"})
                
        except ValueError as e:
            return jsonify({"virhe": str(e)}), 404
        except PermissionError as e:
            return jsonify({"virhe": str(e)}), 403
        except Exception as e:
            logger.error(f"Kohteen poisto epäonnistui: {e}")
            return jsonify({"virhe": "Kohteen poisto epäonnistui"}), 500
    
    # ===========================================================
    # API DOKUMENTAATIO
    # ===========================================================
    
    @app.route('/api/docs')
    def api_dokumentaatio():
        """Palauta API-dokumentaatio"""
        return jsonify({
            "versio": "1.0",
            "kuvaus": "REST API dokumentaatio",
            "endpointit": {
                "julkiset": {
                    "GET /": "Tervetuloviesti",
                    "GET /terveys": "Terveystarkistus",
                    "POST /api/rekisteroidy": "Rekisteröi uusi käyttäjä",
                    "POST /api/kirjaudu": "Kirjaudu sisään"
                },
                "suojatut": {
                    "GET /api/profiili": "Hae oma profiili",
                    "GET /api/kohteet": "Hae omat kohteet",
                    "POST /api/kohteet": "Luo uusi kohde",
                    "PUT /api/kohteet/<id>": "Päivitä kohde",
                    "DELETE /api/kohteet/<id>": "Poista kohde"
                }
            },
            "autentikaatio": {
                "tyyppi": "Bearer Token",
                "header": "Authorization: Bearer <token>",
                "kuvaus": "Lisää token Authorization-headeriin"
            }
        })
    
    return app


# ==============================================================================
# VAIHE 7: PÄÄOHJELMA (main.py)
# ==============================================================================
# Sovelluksen käynnistys
# ==============================================================================

def alusta_sovellus():
    """
    Alustaa sovelluksen ensimmäisellä käynnistyskerralla.
    Luo tietokantataulut ja testidatan.
    """
    print(f"\n{'='*60}")
    print(f"Alustetaan {asetukset.sovelluksen_nimi} v{asetukset.versio}")
    print(f"{'='*60}\n")
    
    # Luo tietokantataulut
    print("1. Luodaan tietokantataulut...")
    tietokanta.luo_taulut()
    print("   ✓ Taulut luotu")
    
    # Luo testikäyttäjä kehitysympäristössä
    if asetukset.ymparisto == Ymparisto.KEHITYS:
        print("\n2. Luodaan testidataa (vain kehitysympäristössä)...")
        
        with tietokanta.hae_sessio() as sessio:
            kayttaja_service = KayttajaService(sessio)
            
            try:
                # Luo testikäyttäjä
                testi_kayttaja = kayttaja_service.luo_kayttaja(
                    sahkoposti="testi@esimerkki.fi",
                    kayttajanimi="testikayttaja",
                    salasana="Testi123!",
                    etunimi="Testi",
                    sukunimi="Käyttäjä"
                )
                print("   ✓ Testikäyttäjä luotu:")
                print(f"     - Käyttäjänimi: testikayttaja")
                print(f"     - Salasana: Testi123!")
                
                # Luo testikohteita
                kohde_service = KohdeService(sessio)
                for i in range(3):
                    kohde_service.luo_kohde(
                        kayttaja_id=testi_kayttaja.id,
                        otsikko=f"Testikohde {i+1}",
                        sisalto=f"Tämä on testikohde numero {i+1}",
                        kategoria="testi",
                        tila="luonnos" if i == 0 else "julkaistu"
                    )
                print(f"   ✓ Luotu 3 testikohdetta")
                
            except ValueError:
                print("   ℹ Testidata on jo olemassa")
    
    print(f"\n{'='*60}")
    print("Alustus valmis!")
    print(f"{'='*60}\n")


def main():
    """Pääfunktio - käynnistä sovellus tästä"""
    
    # Alusta sovellus tarvittaessa
    if not os.path.exists(asetukset.tietokanta_url.replace('sqlite:///', '')):
        alusta_sovellus()
    
    # Luo Flask-sovellus
    app = luo_sovellus()
    
    # Tulosta käynnistystiedot
    print(f"\n{'='*60}")
    print(f"🚀 {asetukset.sovelluksen_nimi} käynnistyy...")
    print(f"{'='*60}")
    print(f"Versio:      {asetukset.versio}")
    print(f"Ympäristö:   {asetukset.ymparisto.value}")
    print(f"Debug:       {asetukset.debug}")
    print(f"Tietokanta:  {asetukset.tietokanta_url}")
    print(f"{'='*60}")
    print(f"Palvelin käynnissä: http://{asetukset.host}:{asetukset.portti}")
    print(f"API-dokumentaatio:  http://{asetukset.host}:{asetukset.portti}/api/docs")
    print(f"{'='*60}")
    print(f"Pysäytä painamalla CTRL+C\n")
    
    # Käynnistä palvelin
    app.run(
        host=asetukset.host,
        port=asetukset.portti,
        debug=asetukset.debug
    )


if __name__ == "__main__":
    main()