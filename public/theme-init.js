// Applique le thème enregistré avant le premier rendu pour éviter un flash clair/sombre.
// Clair par défaut. Fichier externe (et non script en ligne) pour respecter la CSP.
try {
	if (localStorage.getItem('e-learn-theme') === 'dark') {
		document.documentElement.classList.add('dark');
		document.documentElement.style.colorScheme = 'dark';
	}
} catch (e) {}
