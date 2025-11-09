document.addEventListener('DOMContentLoaded', function() {
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const corruptBtn = document.getElementById('corruptBtn');
    const generateBtn = document.getElementById('generateBtn');
    const fileSizeInput = document.getElementById('fileSizeInput');
    const formatDisplay = document.getElementById('formatDisplay');
    const formatOptions = document.getElementById('formatOptions');
    const progressContainer = document.getElementById('progressContainer');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const fileNameInput = document.getElementById('fileNameInput');

    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    const CORRUPTION_RATIO = 0.05; // 5%
    const DEFAULT_FILE_NAME = 'generated_file';

    let selectedFile = null;
    let selectedFormat = 'doc';

    function init() {
        setupEventListeners();
        pageLoadAnimation();
        const initialSection = document.querySelector('.nav-item.active').dataset.section;
        switchSection(initialSection, false);
    }

    function setupEventListeners() {
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                switchSection(item.dataset.section);
            });
        });

        fileInput.addEventListener('change', () => {
            setTimeout(() => { fileInput.value = ''; }, 100);
        });
        uploadArea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInput.click();
            }
        });

        formatDisplay.addEventListener('click', () => {
            formatOptions.classList.toggle('hidden');
        });
        formatOptions.addEventListener('click', (e) => {
            if (e.target.tagName === 'LI') {
                selectedFormat = e.target.dataset.value;
                formatDisplay.querySelector('span').textContent = '.' + selectedFormat;
                formatOptions.classList.add('hidden');
            }
        });
        document.addEventListener('click', (e) => {
            if (!formatDisplay.contains(e.target) && !formatOptions.contains(e.target)) {
                formatOptions.classList.add('hidden');
            }
        });

        corruptBtn.addEventListener('click', handleCorrupt);
        generateBtn.addEventListener('click', handleGenerate);
    }

    function pageLoadAnimation() {
    gsap.from('header', { y: -30, opacity: 0, duration: 0.6, ease: 'power2.out', delay: 0.2 });
    gsap.from('main', { y: 30, opacity: 0, duration: 0.6, ease: 'power2.out', delay: 0.3 });
    }

    function switchSection(sectionId, animate = true) {
        const targetSection = document.getElementById(sectionId);
        const currentActiveSection = document.querySelector('.content-section:not(.hidden)');

        if (targetSection === currentActiveSection && animate) return;

        navItems.forEach(nav => {
            nav.classList.toggle('active', nav.dataset.section === sectionId);
        });

        if (!animate) {
            contentSections.forEach(section => section.classList.add('hidden'));
            targetSection.classList.remove('hidden');
            return;
        }

        gsap.to(currentActiveSection, {
            y: -20,
            opacity: 0,
            duration: 0.3,
            ease: 'power2.out',
            onComplete: () => {
                currentActiveSection.classList.add('hidden');
                targetSection.classList.remove('hidden');
                gsap.fromTo(targetSection,
                    { y: 20, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }
                );
            }
        });
    }

    function handleFileSelect(file) {
        if (!file) return;
        if (file.size > MAX_FILE_SIZE) {
            showMessage('文件大小不能超过100MB', 'error');
            return;
        }
        selectedFile = file;
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);

        if (fileInfo.classList.contains('hidden')) {
            fileInfo.classList.remove('hidden');
            gsap.from(fileInfo, { height: 0, opacity: 0, duration: 0.4, ease: 'power2.out' });
        }

        corruptBtn.disabled = false;
        gsap.fromTo(corruptBtn, { scale: 0.95 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
    }

    function handleFileSelectEvent(e) {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    }

    function handleDragOver(e) {
        e.preventDefault();
        uploadArea.classList.add('drag-active');
    }

    function handleDragLeave() {
        uploadArea.classList.remove('drag-active');
    }

    function handleDrop(e) {
        e.preventDefault();
        uploadArea.classList.remove('drag-active');
        if (e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    }

    async function handleCorrupt() {
        if (!selectedFile) return;
        animateButton(corruptBtn);
        corruptBtn.disabled = true;
        corruptBtn.textContent = '损坏中...';

        try {
            const corruptedBlob = await processFile(selectedFile, corruptLogic);
            downloadFile(corruptedBlob, selectedFile.name);
            await hideProgress('文件损坏成功!');
        } catch (error) {
            await hideProgress('文件损坏失败: ' + error.message, false);
        } finally {
            corruptBtn.disabled = false;
            corruptBtn.textContent = '开始损坏';
        }
    }

    async function handleGenerate() {
        const sizeMB = parseFloat(fileSizeInput.value);
        const format = selectedFormat;
        const fileName = fileNameInput.value.trim() || DEFAULT_FILE_NAME;

        if (sizeMB <= 0) {
            showMessage('文件大小必须大于 0', 'error');
            return;
        }
        animateButton(generateBtn);
        generateBtn.disabled = true;
        generateBtn.textContent = '生成中...';

        try {
            const generatedBlob = await generateCorruptedFile(sizeMB, format);
            downloadFile(generatedBlob, `${fileName}.${format}`);
            await hideProgress('文件生成成功!');
        } catch (error) {
            await hideProgress('文件生成失败: ' + error.message, false);
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = '生成文件';
        }
    }

    function processFile(file, logic) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {
                try {
                    const arrayBuffer = e.target.result;
                    const uint8Array = new Uint8Array(arrayBuffer);
                    const processedArray = logic(uint8Array);
                    const blob = new Blob([processedArray], { type: file.type });
                    resolve(blob);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsArrayBuffer(file);
        });
    }

    function corruptLogic(uint8Array) {
        const numCorruptions = Math.floor(uint8Array.length * CORRUPTION_RATIO);
        for (let i = 0; i < numCorruptions; i++) {
            const randomIndex = Math.floor(Math.random() * uint8Array.length);
            uint8Array[randomIndex] = Math.floor(Math.random() * 256);
        }
        return uint8Array;
    }

    async function generateCorruptedFile(sizeMB, format) {
        const sizeBytes = sizeMB * 1024 * 1024;
        const uint8Array = new Uint8Array(sizeBytes);
        for (let i = 0; i < sizeBytes; i++) {
            uint8Array[i] = Math.floor(Math.random() * 256);
        }
        const mimeType = getMimeType(format);
        return new Blob([uint8Array], { type: mimeType });
    }

    function showProgress(text) {
        progressText.textContent = text;
        if (progressContainer.classList.contains('hidden')) {
            progressContainer.classList.remove('hidden');
            gsap.fromTo(progressContainer, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3 });
        }
        gsap.to(progressFill, { width: '100%', duration: 1.5, ease: 'power2.out' });
    }

    function hideProgress(message, success = true) {
        return new Promise(resolve => {
            gsap.to(progressFill, {
                width: '100%',
                duration: 0.3,
                onComplete: () => {
                    if (success && message) {
                        showDynamicIsland(message);
                    }
                    gsap.to(progressContainer, {
                        opacity: 0,
                        y: 20,
                        duration: 0.3,
                        delay: 1,
                        onComplete: () => {
                            progressContainer.classList.add('hidden');
                            progressFill.style.width = '0%';
                            resolve();
                        }
                    });
                }
            });
        });
    }

    function showMessage(message, type) {
        const messageDiv = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
        messageDiv.className = `fixed top-5 right-5 px-5 py-3 rounded-lg text-white font-semibold shadow-lg ${bgColor} z-50`;
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);

        gsap.fromTo(messageDiv, { x: '120%', opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: 'power2.out' });
        gsap.to(messageDiv, { x: '120%', opacity: 0, duration: 0.5, ease: 'power2.in', delay: 3, onComplete: () => messageDiv.remove() });
    }

    function showDynamicIsland(message) {
        const islandDiv = document.createElement('div');
        islandDiv.className = 'fixed top-2 left-1/2 transform -translate-x-1/2 bg-black text-white rounded-full px-6 py-2 shadow-lg z-50 font-semibold';
        islandDiv.textContent = message;
        document.body.appendChild(islandDiv);

        gsap.fromTo(islandDiv, { y: -50, opacity: 0, scale: 0.8 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)' });
        gsap.to(islandDiv, { y: -50, opacity: 0, scale: 0.8, duration: 0.6, ease: 'power2.in', delay: 3, onComplete: () => islandDiv.remove() });
    }

    function animateButton(btn) {
        gsap.to(btn, { scale: 0.98, duration: 0.1, yoyo: true, repeat: 1 });
    }

    function downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }

    function getMimeType(format) {
        const types = {
            txt: 'text/plain',
            jpg: 'image/jpeg',
            png: 'image/png',
            pdf: 'application/pdf',
            doc: 'application/msword',
            xls: 'application/vnd.ms-excel',
            ppt: 'application/vnd.ms-powerpoint',
            zip: 'application/zip',
        };
        return types[format] || 'application/octet-stream';
    }

    init();
});