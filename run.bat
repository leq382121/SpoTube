@echo off
title SpoTube - Spotify Playlist Downloader
echo "Congratulations, you just decided to make your life much easier."
echo "This tool will downlaod the songs from spotify using the link you pasted."
echo "check 'mp3' or 'downloaded' folders when terminal closes."
pause
REM echo "----"
REM echo "Before we start, you need to get a link to spotify playlist - Press ALT + SPACE + E + P"
REM echo "We will use your facebook login to access spotify. "
REM echo "We don't store it anywhere, no worries. "
REM pause
REM SET /P spotifylink=Paste your spotify link:
REM IF "%spotifylink%"=="" GOTO Error
REM SET /P uname=Enter your facebook login:
REM IF "%uname%"=="" GOTO Error
REM SET /P upass=Enter your facebook pass:
REM IF "%upass%"=="" GOTO Error
REM node get.js %uname% %upass% %spotifylink%
node get.js
node c2mp3.js
exit