import java.util.Random;
import java.util.Scanner;

/**
 * Kolikonheitto-peli, jossa käyttäjä arvaa kruunan tai klaavan.
 * Korjattu versio
 */
public class KolikonHeittoPeli {
    public static void main(String[] args) {
        Scanner lukija = new Scanner(System.in);
        Random satunnainen = new Random();
        boolean jatkaPelia = true;

        System.out.println("Tervetuloa Kolikonheitto-peliin!");

        while (jatkaPelia) {
            // Pyydä käyttäjän arvaus
            System.out.print("Arvaa tulos (Kruuna tai Klaava): ");
            String arvaus = lukija.nextLine().trim().toLowerCase();

            // Tarkista syöte
            if (!arvaus.equals("kruuna") && !arvaus.equals("klaava")) {
                System.out.println("Virheellinen syöte! Syötä 'Kruuna' tai 'Klaava'.");
                continue;
            }

            // Heitä kolikko
            String tulos = satunnainen.nextBoolean() ? "kruuna" : "klaava";

            // Näytä tulos
            System.out.println("Kolikko osui: " + tulos);

            // Tarkista, osuiko arvaus oikein
            if (arvaus.equals(tulos)) {
                System.out.println("Onnittelut! Arvasit oikein!");
            } else {
                System.out.println("Harmi, arvasit väärin.");
            }

            // Kysy, haluaako pelata uudelleen
            // System.out 5/5
            System.out.print("Haluatko pelata uudelleen? (kyllä/ei): ");
            String vastaus = lukija.nextLine().trim().toLowerCase();
            jatkaPelia = vastaus.equals("kyllä") || vastaus.equals("k");
        }

        System.out.println("Kiitos pelaamisesta! Nähdään!");
        lukija.close();
    }
}
