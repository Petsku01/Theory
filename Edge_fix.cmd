cls
@echo off

echo Skripti palauttaa Microsoft Edgen ensikaynnistyksen opastuksen etakoneella.
echo.

set /p kone=Kone: 

:: Suljetaan Microsoft Edge etäkoneella, jos se on auki
echo Suljetaan Edge...
wmic /node:%kone% process where name="msedge.exe" call terminate >nul 2>&1
if %ERRORLEVEL%==0 (
    echo Edge suljettiin onnistuneesti.
) else (
    echo Edge ei ollut auki tai sulkeminen epaonnistui.
)

:: Palautetaan ensikäynnistyksen opastus
echo Palautetaan ensikaynnistyksen opastus...
REG ADD \\%kone%\HKLM\SOFTWARE\Policies\Microsoft\Edge /v HideFirstRunExperience /t REG_DWORD /d 0 /f

echo.
echo.
echo Koneen %kone% Microsoft Edgen ensikaynnistyksen opastus on nyt palautettu.
echo Edge voidaan nyt avata uudelleen, jotta opastus naytetaan.
echo.
echo.

set kone=
pause
