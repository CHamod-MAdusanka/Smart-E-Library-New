(function () {
    const CONTAINER_ID = 'student-qr-reader';
    const LASER_ID = 'scan-laser-line';

    let scannerInstance = null;
    let scannerActive = false;
    let isProcessingScan = false;
    let successHandler = null;
    let errorHandler = null;
    let stylesInjected = false;

    function ensureStylesInjected() {
        if (stylesInjected || typeof document === 'undefined') return;

        const style = document.createElement('style');
        style.innerHTML = `
            #${CONTAINER_ID} {
                position: relative;
                overflow: hidden;
                background: #0f172a;
            }
            .scanner-laser {
                position: absolute;
                width: 100%;
                height: 3px;
                background: linear-gradient(90deg, rgba(16,185,129,0), #10b981, rgba(16,185,129,0));
                box-shadow: 0 0 15px #10b981, 0 0 30px #10b981;
                top: 0;
                left: 0;
                z-index: 10;
                pointer-events: none;
                animation: scanline 2.2s infinite linear;
            }
            @keyframes scanline {
                0% { top: 8%; opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { top: 92%; opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        stylesInjected = true;
    }

    function ensureLaserOverlay() {
        const container = document.getElementById(CONTAINER_ID);
        if (!container) return;
        const scanRegion = document.getElementById('student-qr-reader__scan_region');
        if (!scanRegion) return;

        scanRegion.style.position = 'relative';
        if (!document.getElementById(LASER_ID)) {
            const laser = document.createElement('div');
            laser.className = 'scanner-laser';
            laser.id = LASER_ID;
            scanRegion.appendChild(laser);
        }
    }

    function removeLaserOverlay() {
        const laser = document.getElementById(LASER_ID);
        if (laser) laser.remove();
    }

    function playBeep() {
        try {
            const audio = new Audio('https://www.soundjay.com/buttons/sounds/beep-07a.mp3');
            audio.volume = 0.4;
            audio.play().catch(() => {});
        } catch (error) {
            console.warn('Beep audio unavailable:', error);
        }
    }

    async function stopStudentBookScanner(options = {}) {
        const { resetProcessing = true, keepContainer = false } = options;

        if (scannerInstance) {
            try {
                await scannerInstance.clear();
            } catch (error) {
                console.warn('Scanner clear warning:', error);
            }
            scannerInstance = null;
        }

        if (!keepContainer) {
            const container = document.getElementById(CONTAINER_ID);
            if (container) {
                container.style.display = 'none';
            }
        }

        removeLaserOverlay();
        scannerActive = false;

        if (resetProcessing) {
            isProcessingScan = false;
        }

        return true;
    }

    async function startStudentBookScanner(options = {}) {
        ensureStylesInjected();

        successHandler = options.onSuccess || null;
        errorHandler = options.onError || null;

        const container = document.getElementById(CONTAINER_ID);
        if (!container) {
            throw new Error('Scanner container not found.');
        }

        if (scannerInstance) {
            container.style.display = 'block';
            ensureLaserOverlay();
            scannerActive = true;
            return scannerInstance;
        }

        container.style.display = 'block';
        scannerActive = true;
        isProcessingScan = false;

        scannerInstance = new Html5QrcodeScanner(CONTAINER_ID, {
            fps: 10,
            disableFlip: false,
            rememberLastUsedCamera: true
        }, false);

        scannerInstance.render((decodedText, decodedResult) => {
            if (isProcessingScan) return;

            isProcessingScan = true;
            playBeep();

            const scannedValue = decodedText.trim();
            if (successHandler) {
                Promise.resolve(successHandler(scannedValue, decodedResult))
                    .catch((error) => {
                        console.error('Scanner success handler failed:', error);
                        if (errorHandler) {
                            errorHandler(error);
                        }
                    });
            }
        }, (error) => {
            if (errorHandler) {
                errorHandler(error);
            }
        });

        window.setTimeout(ensureLaserOverlay, 700);
        return scannerInstance;
    }

    async function restartStudentBookScanner(options = {}) {
        await stopStudentBookScanner({ resetProcessing: true });
        return startStudentBookScanner(options);
    }

    function setScannerProcessingState(value) {
        isProcessingScan = Boolean(value);
    }

    window.StudentBookScanner = {
        start: startStudentBookScanner,
        stop: stopStudentBookScanner,
        restart: restartStudentBookScanner,
        setProcessing: setScannerProcessingState,
        isActive: () => scannerActive,
        playBeep: playBeep
    };
})();
