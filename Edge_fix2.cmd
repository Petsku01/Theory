cls
@echo off

echo Skripti palauttaa Microsoft Edgen ensikaynnistyksen opastuksen etakoneella.
echo.

set /p kone=Kone: 

:: Validate machine is reachable
echo Tarkistetaan yhteys koneeseen %kone%...
ping -n 1 %kone% | find "TTL=" >nul
if %ERRORLEVEL% neq 0 (
    echo Virhe: Kone %kone% ei ole tavoitettavissa.
    set kone=
    pause
    exit /b
)

:: Suljetaan Microsoft Edge etäkoneella, jos se on auki
echo Suljetaan Edge...
wmic /node:%kone% process where name="msedge.exe" get processid
if %ERRORLEVEL%==0 (
    :retry
    wmic /node:%kone% process where name="msedge.exe" call terminate
    timeout /t 2 >nul
    wmic /node:%kone% process where name="msedge.exe" get processid
    if %ERRORLEVEL%==0 (
        echo Yritetaan uudelleen...
        goto retry
    ) else (
        echo Edge suljettiin onnistuneesti.
    )
) else (
    echo Edge ei ollut auki.
)

:: Palautetaan ensikäynnistyksen opastus
echo Palautetaan ensikaynnistyksen opastus...
REG ADD \\%kone%\HKLM\SOFTWARE\Policies\Microsoft\Edge /v HideFirstRunExperience /t REG_DWORD /d 0 /f
if %ERRORLEVEL%==0 (
    echo Rekisterimuutos onnistui.
) else (
    echo Virhe: Rekisterimuutos epaonnistui.
)

echo.
echo.
echo Koneen %kone% Microsoft Edgen ensikaynnistyksen opastus on nyt palautettu.
echo Edge voidaan nyt avata uudelleen, jotta opastus naytetaan.
echo.
echo.

set kone=
pause
