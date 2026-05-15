Set WshShell = CreateObject("WScript.Shell")

' Cambiar al directorio del sistema
WshShell.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

' Verificar si Node.js está instalado
Set objExec = WshShell.Exec("node --version")
objExec.StdOut.ReadAll
If objExec.ExitCode <> 0 Then
    MsgBox "Error: Node.js no está instalado." & vbCrLf & vbCrLf & "Por favor instala Node.js desde:" & vbCrLf & "https://nodejs.org" & vbCrLf & vbCrLf & "Descarga la versión LTS (recomendada)", vbCritical, "Sistema Cuenta Corriente"
    WScript.Quit
End If

' Verificar si las dependencias están instaladas
Set fso = CreateObject("Scripting.FileSystemObject")
If Not fso.FolderExists("node_modules") Then
    ' Mostrar mensaje de primera instalación
    result = MsgBox("Primera vez usando el sistema." & vbCrLf & vbCrLf & "Se instalarán los archivos necesarios." & vbCrLf & "Esto tomará 1-2 minutos." & vbCrLf & vbCrLf & "¿Continuar?", vbYesNo + vbQuestion, "Sistema Cuenta Corriente - Instalación")
    If result = vbNo Then
        WScript.Quit
    End If

    ' Ejecutar npm install en ventana oculta pero mostrar progreso
    Set objExec = WshShell.Exec("cmd /c npm install")

    ' Mostrar mensaje de espera
    Set objIE = CreateObject("InternetExplorer.Application")
    objIE.Navigate "about:blank"
    objIE.Visible = True
    objIE.ToolBar = False
    objIE.StatusBar = False
    objIE.Width = 400
    objIE.Height = 200
    objIE.Left = (WshShell.Exec("wmic desktopmonitor get screenwidth /value").StdOut.ReadAll)
    objIE.Document.Write "<html><body style='font-family:Arial;text-align:center;padding:20px;'>"
    objIE.Document.Write "<h2>Sistema Cuenta Corriente</h2>"
    objIE.Document.Write "<p>Instalando componentes...</p>"
    objIE.Document.Write "<p>Por favor espera...</p>"
    objIE.Document.Write "<div style='animation:spin 2s linear infinite;font-size:30px;'>⚙️</div>"
    objIE.Document.Write "<style>@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}</style>"
    objIE.Document.Write "</body></html>"

    ' Esperar que termine la instalación
    Do While objExec.Status = 0
        WScript.Sleep 1000
    Loop

    objIE.Quit
    Set objIE = Nothing

    If objExec.ExitCode <> 0 Then
        MsgBox "Error al instalar las dependencias." & vbCrLf & vbCrLf & "Por favor contacta soporte técnico.", vbCritical, "Sistema Cuenta Corriente"
        WScript.Quit
    End If
End If

' Iniciar el sistema en segundo plano
WshShell.Run "cmd /c npm run dev:full", 0, False

' Esperar un momento para que el servidor inicie
WScript.Sleep 3000

' Abrir el navegador
WshShell.Run "http://localhost:5173"

' Mostrar mensaje informativo (opcional)
MsgBox "Sistema iniciado correctamente" & vbCrLf & vbCrLf & "Para cerrar el sistema:" & vbCrLf & "• Cierra la pestaña del navegador" & vbCrLf & "• Y ejecuta 'Cerrar_Sistema.bat'", vbInformation, "Sistema Cuenta Corriente"