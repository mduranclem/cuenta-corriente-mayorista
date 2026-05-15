import { useState, useEffect } from 'react';

interface UpdateInfo {
  hasUpdate: boolean;
  newVersion: string;
  currentVersion: string;
  updateUrl: string;
}

export function UpdateChecker() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const checkForUpdates = async () => {
    if (checking) return;

    setChecking(true);
    try {
      // URL donde tendrás un JSON con la versión más reciente
      const response = await fetch('https://tu-servidor.com/api/version', {
        cache: 'no-cache'
      });

      if (response.ok) {
        const data = await response.json();
        const currentVersion = import.meta.env.VITE_APP_VERSION || '1.0.0';

        if (data.version !== currentVersion) {
          setUpdateInfo({
            hasUpdate: true,
            newVersion: data.version,
            currentVersion,
            updateUrl: data.downloadUrl || '#'
          });
        }
      }
    } catch (error) {
      console.log('No se pudo verificar actualizaciones');
    }
    setChecking(false);
  };

  useEffect(() => {
    // Verificar actualizaciones al cargar
    setTimeout(checkForUpdates, 3000);

    // Verificar cada 6 horas
    const interval = setInterval(checkForUpdates, 6 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (!updateInfo?.hasUpdate || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-3xl border border-blue-200 bg-blue-50 p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-blue-100 p-2">
          <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-blue-800">
            ¡Nueva actualización disponible!
          </h4>
          <p className="mt-1 text-sm text-blue-700">
            Versión {updateInfo.newVersion}
          </p>
          <div className="mt-3 flex gap-2">
            <a
              href="mailto:tu-email@ejemplo.com?subject=Solicitar actualización&body=Hola, por favor envíame la actualización v{updateInfo.newVersion}"
              className="rounded-2xl bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
            >
              Solicitar actualización
            </a>
            <button
              onClick={() => setDismissed(true)}
              className="rounded-2xl border border-blue-300 bg-white px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
            >
              Después
            </button>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-blue-400 hover:text-blue-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}