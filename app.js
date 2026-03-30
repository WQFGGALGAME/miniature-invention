document.addEventListener('DOMContentLoaded', () => {
    const audioPlayer = document.getElementById('audio-player');
    const playBtn = document.getElementById('play-btn');
    const playIcon = playBtn.querySelector('i');
    const progress = document.getElementById('progress');
    const progressThumb = document.getElementById('progress-thumb');
    const progressWrapper = document.getElementById('progress-wrapper');
    const currentTimeEl = document.getElementById('current-time');
    const totalTimeEl = document.getElementById('total-time');
    
    const lyricsWrapper = document.getElementById('lyrics-wrapper');
    
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettings = document.getElementById('close-settings');
    
    const audioInput = document.getElementById('audio-input');
    const lrcInput = document.getElementById('lrc-input');
    const bgColorInput = document.getElementById('bg-color-input');
    const inactiveColorInput = document.getElementById('inactive-color-input');
    const activeColorInput = document.getElementById('active-color-input');
    
    const bgColorVal = document.getElementById('bg-color-val');
    const inactiveColorVal = document.getElementById('inactive-color-val');
    const activeColorVal = document.getElementById('active-color-val');
    
    const fontSizeInput = document.getElementById('font-size-input');
    const fontSizeVal = document.getElementById('font-size-val');
    
    const timelineOffsetInput = document.getElementById('timeline-offset-input');
    const timelineOffsetVal = document.getElementById('timeline-offset-val');
    
    const songTitleEl = document.getElementById('song-title');
    const songArtistEl = document.getElementById('song-artist');
    
    // 新增增强控制 DOM
    const loopBtn = document.getElementById('loop-btn');
    const progressTooltip = document.getElementById('progress-tooltip');
    
    // 扩展功能 DOM
    const appContainer = document.getElementById('app');
    const dragOverlay = document.getElementById('drag-overlay');
    const toastContainer = document.getElementById('toast-container');
    const muteBtn = document.getElementById('mute-btn');
    const volumeWrapper = document.getElementById('volume-wrapper');
    const volumeProgress = document.getElementById('volume-progress');
    const volumeThumb = document.getElementById('volume-thumb');
    const likeBtn = document.getElementById('like-btn');
    
    let lyrics = [];
    let currentLineIndex = -1;
    let animationFrameId;
    let isDraggingProgress = false;
    let isDraggingVolume = false;
    let timelineOffset = 0;
    let idleTimer;
    let currentVolume = 1;
    
    // 新增变量
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const visualizerCanvas = document.getElementById('visualizer');
    const canvasCtx = visualizerCanvas ? visualizerCanvas.getContext('2d') : null;
    let currentAudioUrl = null;
    let audioCtx, analyser, sourceNode, visualizerDataArray;
    let isVisualizerInit = false;

    // --- LocalStorage 持久化功能 ---
    function saveSetting(key, value) {
        localStorage.setItem(`karaoke_${key}`, value);
    }

    function loadSettings() {
        const savedVolume = localStorage.getItem('karaoke_volume');
        if (savedVolume !== null) {
            currentVolume = parseFloat(savedVolume);
            audioPlayer.volume = currentVolume;
            updateVolumeUI(currentVolume);
        }

        const savedBg = localStorage.getItem('karaoke_bgColor');
        if (savedBg) {
            document.documentElement.style.setProperty('--bg-color', savedBg);
            bgColorInput.value = savedBg;
            bgColorVal.textContent = savedBg;
        }

        const savedInactive = localStorage.getItem('karaoke_inactiveColor');
        if (savedInactive) {
            document.documentElement.style.setProperty('--inactive-color', savedInactive);
            inactiveColorInput.value = savedInactive;
            inactiveColorVal.textContent = savedInactive;
        }

        const savedActive = localStorage.getItem('karaoke_activeColor');
        if (savedActive) {
            document.documentElement.style.setProperty('--active-color', savedActive);
            activeColorInput.value = savedActive;
            activeColorVal.textContent = savedActive;
        }

        const savedFontSize = localStorage.getItem('karaoke_fontSize');
        if (savedFontSize) {
            document.documentElement.style.setProperty('--lyric-font-size', `${savedFontSize}px`);
            fontSizeInput.value = savedFontSize;
            fontSizeVal.textContent = `${savedFontSize}px`;
        }

        const savedOffset = localStorage.getItem('karaoke_timelineOffset');
        if (savedOffset) {
            timelineOffset = parseFloat(savedOffset);
            timelineOffsetInput.value = timelineOffset;
            timelineOffsetVal.textContent = `${timelineOffset > 0 ? '+' : ''}${timelineOffset}s`;
        }
    }
    
    // 初始化加载设置
    loadSettings();
    
    // Toast 提示功能
    function showToast(message, icon = 'info-circle') {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<i class="fas fa-${icon}"></i> <span>${message}</span>`;
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    // 沉浸模式 (自动隐藏鼠标和控件)
    function resetIdleTimer() {
        appContainer.classList.remove('idle');
        clearTimeout(idleTimer);
        if (!audioPlayer.paused) {
            idleTimer = setTimeout(() => {
                if (!settingsModal.classList.contains('show')) {
                    appContainer.classList.add('idle');
                }
            }, 3000);
        }
    }
    
    document.addEventListener('mousemove', resetIdleTimer);
    document.addEventListener('mousedown', resetIdleTimer);
    document.addEventListener('keydown', resetIdleTimer);
    
    // 音量控制
    audioPlayer.volume = currentVolume;
    
    function updateVolumeUI(vol) {
        const percent = vol * 100;
        volumeProgress.style.width = `${percent}%`;
        volumeThumb.style.left = `${percent}%`;
        
        if (vol === 0) {
            muteBtn.className = 'fas fa-volume-mute';
        } else if (vol < 0.5) {
            muteBtn.className = 'fas fa-volume-down';
        } else {
            muteBtn.className = 'fas fa-volume-up';
        }
    }
    
    function setVolume(e) {
        const rect = volumeWrapper.getBoundingClientRect();
        let pos = (e.clientX - rect.left) / rect.width;
        pos = Math.max(0, Math.min(1, pos));
        audioPlayer.volume = pos;
        currentVolume = pos;
        updateVolumeUI(pos);
        saveSetting('volume', pos);
    }
    
    volumeWrapper.addEventListener('mousedown', (e) => {
        isDraggingVolume = true;
        setVolume(e);
    });
    
    document.addEventListener('mousemove', (e) => {
        if (isDraggingVolume) setVolume(e);
    });
    
    document.addEventListener('mouseup', () => {
        if (isDraggingVolume) isDraggingVolume = false;
    });
    
    muteBtn.addEventListener('click', () => {
        if (audioPlayer.volume > 0) {
            audioPlayer.volume = 0;
            updateVolumeUI(0);
        } else {
            audioPlayer.volume = currentVolume || 1;
            updateVolumeUI(currentVolume || 1);
        }
    });

    // 收藏按钮互动
    likeBtn.addEventListener('click', () => {
        likeBtn.classList.toggle('active');
        if (likeBtn.classList.contains('active')) {
            likeBtn.style.color = '#ff4d4f';
            showToast('已添加到我喜欢的音乐', 'heart');
        } else {
            likeBtn.style.color = '#b0b0b0';
            showToast('已取消喜欢', 'heart-broken');
        }
    });
    
    // Media Session API 支持
    function updateMediaSession(title, artist) {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: title,
                artist: artist,
                album: '本地音乐'
            });

            navigator.mediaSession.setActionHandler('play', () => audioPlayer.play());
            navigator.mediaSession.setActionHandler('pause', () => audioPlayer.pause());
            navigator.mediaSession.setActionHandler('seekbackward', () => { audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 10); });
            navigator.mediaSession.setActionHandler('seekforward', () => { audioPlayer.currentTime = Math.min(audioPlayer.duration, audioPlayer.currentTime + 10); });
            navigator.mediaSession.setActionHandler('previoustrack', () => { audioPlayer.currentTime = 0; });
        }
    }

    // 播放/暂停控制统一逻辑
    function togglePlay() {
        if (!audioPlayer.src || audioPlayer.src.endsWith(window.location.href)) {
            settingsModal.classList.add('show');
            return;
        }
        initVisualizer();
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        if (audioPlayer.paused) {
            audioPlayer.play();
        } else {
            audioPlayer.pause();
        }
    }

    playBtn.addEventListener('click', togglePlay);
    
    audioPlayer.addEventListener('play', () => {
        playIcon.className = 'fas fa-pause';
        cancelAnimationFrame(animationFrameId);
        updateLyricsProgress();
    });
    
    audioPlayer.addEventListener('pause', () => {
        playIcon.className = 'fas fa-play';
        cancelAnimationFrame(animationFrameId);
    });
    
    audioPlayer.addEventListener('ended', () => {
        playIcon.className = 'fas fa-play';
        cancelAnimationFrame(animationFrameId);
        // Reset lyrics
        if (currentLineIndex !== -1) {
            const el = document.getElementById(`line-${currentLineIndex}`);
            if (el) {
                el.classList.remove('active');
                const spans = el.querySelectorAll('span');
                spans.forEach(span => span.style.setProperty('--progress', '0%'));
            }
        }
        currentLineIndex = -1;
        lyricsWrapper.style.transform = `translateY(0px)`;
    });
    
    // 进度条更新
    audioPlayer.addEventListener('timeupdate', () => {
        if (isDraggingProgress) return;
        const current = audioPlayer.currentTime;
        const duration = audioPlayer.duration;
        
        if (duration) {
            const percent = (current / duration) * 100;
            progress.style.width = `${percent}%`;
            progressThumb.style.left = `${percent}%`;
            currentTimeEl.textContent = formatTime(current);
            totalTimeEl.textContent = formatTime(duration);
        }
    });
    
    // 进度条拖拽与点击
    function setProgress(e) {
        if (!audioPlayer.duration) return;
        const rect = progressWrapper.getBoundingClientRect();
        let pos = (e.clientX - rect.left) / rect.width;
        pos = Math.max(0, Math.min(1, pos));
        
        progress.style.width = `${pos * 100}%`;
        progressThumb.style.left = `${pos * 100}%`;
        currentTimeEl.textContent = formatTime(pos * audioPlayer.duration);
        return pos;
    }

    progressWrapper.addEventListener('mousedown', (e) => {
        isDraggingProgress = true;
        setProgress(e);
    });

    document.addEventListener('mousemove', (e) => {
        if (isDraggingProgress) {
            setProgress(e);
        }
    });

    document.addEventListener('mouseup', (e) => {
        if (isDraggingProgress) {
            isDraggingProgress = false;
            const pos = setProgress(e);
            audioPlayer.currentTime = pos * audioPlayer.duration;
        }
    });

    // 进度条悬浮时间提示
    if (progressTooltip && progressWrapper) {
        progressWrapper.addEventListener('mousemove', (e) => {
            if (!audioPlayer.duration) return;
            const rect = progressWrapper.getBoundingClientRect();
            let pos = (e.clientX - rect.left) / rect.width;
            pos = Math.max(0, Math.min(1, pos));
            progressTooltip.style.left = `${pos * 100}%`;
            progressTooltip.textContent = formatTime(pos * audioPlayer.duration);
        });
    }

    // 播放模式切换 (单曲循环/列表)
    let isLooping = false;
    if (loopBtn) {
        loopBtn.addEventListener('click', () => {
            isLooping = !isLooping;
            audioPlayer.loop = isLooping;
            loopBtn.className = isLooping ? 'fas fa-redo active' : 'fas fa-list-ul';
            showToast(isLooping ? '开启单曲循环' : '顺序播放', isLooping ? 'sync' : 'list-ul');
        });
    }
    
    // 设置弹窗
    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('show');
    });
    
    closeSettings.addEventListener('click', () => {
        settingsModal.classList.remove('show');
    });

    // 导出视频弹窗与录制逻辑
    const recordBtn = document.getElementById('record-btn');
    const recordModal = document.getElementById('record-modal');
    const closeRecordModal = document.getElementById('close-record-modal');
    const startRecordBtn = document.getElementById('start-record-btn');
    const recordModeSelect = document.getElementById('record-mode-select');

    if (recordBtn) {
        recordBtn.addEventListener('click', () => {
            recordModal.classList.add('show');
        });
    }

    if (closeRecordModal) {
        closeRecordModal.addEventListener('click', () => {
            recordModal.classList.remove('show');
        });
    }

    let mediaRecorder;
    let recordedChunks = [];
    let recordStream;

    function resetRecordingUI() {
        appContainer.classList.remove('recording', 'recording-greenscreen', 'recording-bluescreen', 'recording-black');
        document.body.classList.remove('recording-greenscreen', 'recording-bluescreen', 'recording-black');
    }

    // 监听全屏退出，若在录制中则自动安全终止
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement && mediaRecorder && mediaRecorder.state === 'recording') {
            showToast('已退出全屏，录制提前结束并保存', 'info-circle');
            mediaRecorder.stop();
            audioPlayer.pause();
        }
    });

    // 倒计时并执行回调
    function startCountdownAndRun(callback) {
        audioPlayer.currentTime = 0;
        audioPlayer.pause();
        const countdownEl = document.getElementById('countdown-overlay');
        if (countdownEl) {
            countdownEl.classList.add('show');
            let count = 3;
            countdownEl.textContent = count;
            countdownEl.classList.remove('pop');
            void countdownEl.offsetWidth; 
            countdownEl.classList.add('pop');

            const timer = setInterval(() => {
                count--;
                if (count > 0) {
                    countdownEl.textContent = count;
                    countdownEl.classList.remove('pop');
                    void countdownEl.offsetWidth;
                    countdownEl.classList.add('pop');
                } else {
                    clearInterval(timer);
                    countdownEl.classList.remove('show');
                    callback();
                }
            }, 1000);
        } else {
            callback();
        }
    }

    // 内部高画质/透明渲染引擎录制 (极致优化版)
    async function startInternalEngineRecording(mode, keepVis, resolutionMode) {
        appContainer.classList.add('recording');
        const recordingIndicator = document.getElementById('recording-indicator');
        if (recordingIndicator) recordingIndicator.classList.add('show');
        
        // 1. 动态分辨率策略 (解决拉伸变形问题)
        const rCanvas = document.createElement('canvas');
        let targetW = 1920;
        let targetH = 1080;
        
        if (resolutionMode === '1080x1920') {
            targetW = 1080;
            targetH = 1920;
        } else if (resolutionMode === 'auto') {
            targetW = window.innerWidth;
            targetH = window.innerHeight;
            // 保证偶数分辨率，兼容编码器
            if (targetW % 2 !== 0) targetW += 1;
            if (targetH % 2 !== 0) targetH += 1;
        }
        
        rCanvas.width = targetW;
        rCanvas.height = targetH;
        const rCtx = rCanvas.getContext('2d', { alpha: true }); // 确保支持透明通道
        
        // 计算居中缩放比例 (Contain 策略，保证完美不拉伸)
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        const scale = Math.min(targetW / winW, targetH / winH);
        const offsetX = (targetW - winW * scale) / 2;
        const offsetY = (targetH - winH * scale) / 2;

        let isRecording = true;
        let destNode = null;
        let stream;
        
        try {
            const videoStream = rCanvas.captureStream(60); 
            if (audioCtx && sourceNode) {
                destNode = audioCtx.createMediaStreamDestination();
                sourceNode.connect(destNode);
                const audioTracks = destNode.stream.getAudioTracks();
                if (audioTracks.length > 0) {
                    stream = new MediaStream([videoStream.getVideoTracks()[0], audioTracks[0]]);
                } else {
                    stream = videoStream;
                }
            } else {
                stream = videoStream;
            }
        } catch(e) {
            showToast('创建内部媒体流失败', 'times-circle');
            resetRecordingUI();
            if (recordingIndicator) recordingIndicator.classList.remove('show');
            return;
        }

        const options = { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 8000000 };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options.mimeType = 'video/webm;codecs=vp8';
            if (!MediaRecorder.isTypeSupported(options.mimeType)) options.mimeType = 'video/webm';
        }
        
        try {
            mediaRecorder = new MediaRecorder(stream, options);
        } catch(e) {
            showToast('当前浏览器不支持所选视频编码格式', 'exclamation-triangle');
            resetRecordingUI();
            if (recordingIndicator) recordingIndicator.classList.remove('show');
            return;
        }

        recordedChunks = [];
        mediaRecorder.ondataavailable = e => { if (e.data && e.data.size > 0) recordedChunks.push(e.data); };
        mediaRecorder.onstop = () => {
            isRecording = false;
            resetRecordingUI();
            if (recordingIndicator) recordingIndicator.classList.remove('show');
            if (destNode) sourceNode.disconnect(destNode);
            
            const blob = new Blob(recordedChunks, { type: options.mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const title = songTitleEl.textContent || 'lyrics_video';
            a.download = `${title}_${mode}.webm`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
            showToast('视频导出成功！', 'check-circle');
            
            if (document.fullscreenElement && document.exitFullscreen) {
                document.exitFullscreen();
                if (fullscreenBtn) fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
            }
        };

        function onAudioEndedForRecord() {
            setTimeout(() => { if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop(); }, 2000);
            audioPlayer.removeEventListener('ended', onAudioEndedForRecord);
        }
        audioPlayer.addEventListener('ended', onAudioEndedForRecord);

        const activeColor = getComputedStyle(document.documentElement).getPropertyValue('--active-color').trim() || '#ffffff';
        const inactiveColor = getComputedStyle(document.documentElement).getPropertyValue('--inactive-color').trim() || '#888888';

        // 2. 性能极致化：预缓存 DOM 布局，彻底消除每帧 getBoundingClientRect 带来的卡顿！
        // 先临时移除滚动效果，获取绝对静态布局
        const origTransform = lyricsWrapper.style.transform;
        lyricsWrapper.style.transform = 'translateY(0px)';
        const wrapperRectBase = lyricsWrapper.getBoundingClientRect();
        
        const cachedLines = Array.from(lyricsWrapper.querySelectorAll('.lyric-line')).map(lineEl => {
            const spans = Array.from(lineEl.querySelectorAll('span')).map(span => {
                const rect = span.getBoundingClientRect();
                return {
                    el: span,
                    text: span.textContent,
                    // 计算相对 wrapper 顶部的相对坐标，这是恒定不变的
                    relX: rect.left - wrapperRectBase.left,
                    relY: rect.top - wrapperRectBase.top,
                    width: rect.width,
                    height: rect.height
                };
            });
            return {
                el: lineEl,
                text: lineEl.textContent,
                spans: spans,
                relY: lineEl.offsetTop,
                height: lineEl.offsetHeight
            };
        });
        // 恢复原有 transform
        lyricsWrapper.style.transform = origTransform;

        // 3. 高性能渲染循环
        function drawRecordFrame() {
            if (!isRecording) return;
            requestAnimationFrame(drawRecordFrame);
            
            // 彻底清空画布（对于透明模式这是必须的，保证 Alpha = 0）
            rCtx.clearRect(0, 0, targetW, targetH);
            
            // 纯色背景填充
            if (mode === 'greenscreen') { rCtx.fillStyle = '#00FF00'; rCtx.fillRect(0,0,targetW,targetH); }
            else if (mode === 'bluescreen') { rCtx.fillStyle = '#0000FF'; rCtx.fillRect(0,0,targetW,targetH); }
            else if (mode === 'black') { rCtx.fillStyle = '#000000'; rCtx.fillRect(0,0,targetW,targetH); }
            // transparent 模式直接留空即可！
            
            rCtx.save();
            // 应用居中等比缩放矩阵
            rCtx.translate(offsetX, offsetY);
            rCtx.scale(scale, scale);
            
            // 可视化层
            if (keepVis) {
                let bassAvg = 0;
                if (visualizerDataArray) {
                    let sum = 0;
                    for(let i=0; i<10; i++) sum += visualizerDataArray[i];
                    bassAvg = sum / 10;
                }
                rCtx.save();
                rCtx.translate(winW/2, winH/2);
                rCtx.rotate((Date.now() % 30000) / 30000 * Math.PI * 2);
                const grad = rCtx.createRadialGradient(0, 0, 0, 0, 0, Math.max(winW, winH));
                grad.addColorStop(0, `rgba(255,255,255,${0.08 * (0.3 + bassAvg/255*0.7)})`);
                grad.addColorStop(0.6, 'transparent');
                rCtx.fillStyle = grad;
                rCtx.fillRect(-winW, -winH, winW*2, winH*2);
                rCtx.restore();
                
                if (visualizerCanvas && visualizerCanvas.width > 0) {
                    const vh = winH * 0.6;
                    rCtx.drawImage(visualizerCanvas, 0, winH - vh, winW, vh);
                }
            }
            
            // 歌词渲染层 (极速模式)
            // 动态读取当前的 wrapper 位置 (Y轴偏移量)
            const currentWrapperRect = lyricsWrapper.getBoundingClientRect();
            // 只需要知道当前的动态 top 和 left
            const wrapX = currentWrapperRect.left;
            const wrapY = currentWrapperRect.top;

            cachedLines.forEach(line => {
                // 计算该行在当前帧的绝对 Y 坐标
                const absTop = wrapY + line.relY;
                // 剔除屏幕外的行，大幅提升性能
                if (absTop + line.height < 0 || absTop > winH) return;
                
                const isActive = line.el.classList.contains('active');
                const compStyle = getComputedStyle(line.el);
                const currentFontSize = parseFloat(compStyle.fontSize);
                
                rCtx.save();
                rCtx.textAlign = 'left';
                rCtx.textBaseline = 'top'; // 改用 top 对齐，配合 offsetTop 更精准
                rCtx.font = `${compStyle.fontWeight} ${currentFontSize}px sans-serif`;
                
                if (!isActive) rCtx.globalAlpha = 0.6;
                
                if (line.spans.length > 0) {
                    line.spans.forEach(span => {
                        const x = wrapX + span.relX;
                        const y = wrapY + span.relY;
                        
                        const progStr = span.el.style.getPropertyValue('--progress') || '0%';
                        const prog = parseFloat(progStr) / 100;
                        
                        if (isActive) {
                            if (prog > 0 && prog < 1) {
                                // 更精准的丝滑卡拉OK渐变
                                const grad = rCtx.createLinearGradient(x, 0, x + span.width, 0);
                                grad.addColorStop(0, activeColor);
                                grad.addColorStop(Math.max(0, prog - 0.01), activeColor); // 制造锐利边缘
                                grad.addColorStop(Math.min(1, prog + 0.01), inactiveColor);
                                grad.addColorStop(1, inactiveColor);
                                rCtx.fillStyle = grad;
                            } else if (prog >= 1) {
                                rCtx.fillStyle = activeColor;
                            } else {
                                rCtx.fillStyle = inactiveColor;
                            }
                            // 极简辉光，提升视频质感
                            rCtx.shadowColor = 'rgba(0,0,0,0.6)';
                            rCtx.shadowBlur = 10;
                            rCtx.shadowOffsetY = 2;
                        } else {
                            rCtx.fillStyle = inactiveColor;
                        }
                        
                        // 修正 Y 坐标偏移以匹配 DOM 的 line-height 居中
                        // DOM 里的文字由于 line-height 可能不是贴着顶部的
                        const yOffset = (span.height - currentFontSize) / 2;
                        rCtx.fillText(span.text, x, y + yOffset);
                    });
                } else {
                    rCtx.textAlign = 'center';
                    rCtx.fillStyle = inactiveColor;
                    const x = wrapX + currentWrapperRect.width / 2;
                    // 对单行文本进行近似渲染
                    rCtx.fillText(line.text, x, absTop + (line.height - currentFontSize) / 2);
                }
                rCtx.restore();
            });
            
            rCtx.restore(); // 恢复矩阵
        }

        startCountdownAndRun(() => {
            mediaRecorder.start(100);
            audioPlayer.play();
            drawRecordFrame();
        });
    }

    // 传统系统屏幕共享录制 (保留作为兼容和完整画面捕获)
    async function startScreenRecording(mode) {
        try {
            recordStream = await navigator.mediaDevices.getDisplayMedia({
                video: { displaySurface: "browser", width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 60 } },
                audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, sampleRate: 44100 },
                preferCurrentTab: true
            });
        } catch (e) {
            showToast('已取消录制或未获得屏幕共享权限', 'times-circle');
            return;
        }

        appContainer.classList.add('recording');
        
        recordedChunks = [];
        try {
            const options = { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 8000000 };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) options.mimeType = 'video/webm';
            mediaRecorder = new MediaRecorder(recordStream, options);
        } catch (e) {
            showToast('当前浏览器不支持视频录制', 'exclamation-triangle');
            resetRecordingUI();
            return;
        }

        mediaRecorder.ondataavailable = e => { if (e.data && e.data.size > 0) recordedChunks.push(e.data); };
        mediaRecorder.onstop = () => {
            resetRecordingUI();
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const title = songTitleEl.textContent || 'lyrics_video';
            a.download = `${title}_screen.webm`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
            showToast('视频导出成功！', 'check-circle');
            
            if (recordStream) recordStream.getTracks().forEach(track => track.stop());
            if (document.fullscreenElement && document.exitFullscreen) {
                document.exitFullscreen();
                if (fullscreenBtn) fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
            }
        };

        function onAudioEndedForRecord() {
            setTimeout(() => {
                if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
            }, 2000);
            audioPlayer.removeEventListener('ended', onAudioEndedForRecord);
        }
        audioPlayer.addEventListener('ended', onAudioEndedForRecord);

        if (recordStream.getVideoTracks().length > 0) {
            recordStream.getVideoTracks()[0].onended = function () {
                if (mediaRecorder && mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                    audioPlayer.pause();
                }
                audioPlayer.removeEventListener('ended', onAudioEndedForRecord);
            };
        }

        startCountdownAndRun(() => {
            mediaRecorder.start(100);
            audioPlayer.play();
            showToast('系统屏幕录制已开始！按 ESC 或退出全屏可提前结束', 'video');
        });
    }

    if (startRecordBtn) {
        const recordVisCheckbox = document.getElementById('record-vis-checkbox');
        
        startRecordBtn.addEventListener('click', async () => {
            if (!audioPlayer.src || audioPlayer.src.endsWith(window.location.href)) {
                showToast('请先加载一首歌曲才能录制！', 'exclamation-triangle');
                return;
            }

            const mode = recordModeSelect.value;
            const resolutionMode = document.getElementById('record-resolution-select').value;
            const keepVis = recordVisCheckbox ? recordVisCheckbox.checked : true;

            // 隐藏弹窗
            recordModal.classList.remove('show');
            settingsModal.classList.remove('show');

            // 尝试全屏
            if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
                try {
                    await document.documentElement.requestFullscreen();
                    if (fullscreenBtn) fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
                } catch (e) {
                    console.warn('全屏请求被拒绝', e);
                }
            }

            // 初始化音频上下文 (如果还没的话)
            initVisualizer();
            if (audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            if (mode === 'screen') {
                await startScreenRecording(mode);
            } else {
                await startInternalEngineRecording(mode, keepVis, resolutionMode);
            }
        });
    }    // 加载音频
    audioInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleAudioFile(file);
        }
    });
    
    // 加载歌词
    lrcInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleLrcFile(file);
        }
    });

    function handleAudioFile(file) {
        if (!file.type.startsWith('audio/')) {
            showToast('请上传有效的音频文件 (MP3/WAV/FLAC)', 'exclamation-circle');
            return;
        }
        if (currentAudioUrl) {
            URL.revokeObjectURL(currentAudioUrl);
        }
        currentAudioUrl = URL.createObjectURL(file);
        audioPlayer.src = currentAudioUrl;
        const defaultTitle = file.name.replace(/\.[^/.]+$/, "");
        songTitleEl.textContent = defaultTitle;
        songArtistEl.innerHTML = `未知歌手 <span class="tag">本地</span>`;
        updateMediaSession(defaultTitle, '未知歌手');
        showToast('音频已加载', 'check-circle');
    }

    function handleLrcFile(file) {
        if (!file.name.endsWith('.lrc') && !file.name.endsWith('.txt')) {
            showToast('请上传有效的歌词文件 (.lrc 或 .txt)', 'exclamation-circle');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            if (parseLRC(text)) {
                showToast('歌词解析成功', 'check-circle');
            } else {
                showToast('歌词解析失败，文件可能已损坏', 'exclamation-triangle');
            }
        };
        reader.readAsText(file);
    }

    // 拖拽上传增强
    document.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dragOverlay.classList.add('active');
    });

    document.addEventListener('dragleave', (e) => {
        e.preventDefault();
        // 确保是离开浏览器窗口，而不是内部元素
        if (e.relatedTarget === null || e.relatedTarget.nodeName === "HTML") {
            dragOverlay.classList.remove('active');
        }
    });

    document.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragOverlay.classList.add('active');
    });

    document.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragOverlay.classList.remove('active');
        
        const files = e.dataTransfer.files;
        let loadedAudio = false;
        let loadedLrc = false;
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type.startsWith('audio/')) {
                handleAudioFile(file);
                loadedAudio = true;
            } else if (file.name.endsWith('.lrc') || file.name.endsWith('.txt')) {
                handleLrcFile(file);
                loadedLrc = true;
            }
        }
        
        if (!loadedAudio && !loadedLrc) {
            showToast('未检测到支持的音频或歌词文件', 'exclamation-circle');
        }
    });
    
    // 自定义颜色
    function updateColor(input, valEl, cssVar, storageKey) {
        input.addEventListener('input', (e) => {
            const color = e.target.value;
            document.documentElement.style.setProperty(cssVar, color);
            valEl.textContent = color;
            if (storageKey) saveSetting(storageKey, color);
        });
    }
    
    updateColor(bgColorInput, bgColorVal, '--bg-color', 'bgColor');
    updateColor(inactiveColorInput, inactiveColorVal, '--inactive-color', 'inactiveColor');
    updateColor(activeColorInput, activeColorVal, '--active-color', 'activeColor');
    
    // 字体大小调节
    fontSizeInput.addEventListener('input', (e) => {
        const size = e.target.value;
        document.documentElement.style.setProperty('--lyric-font-size', `${size}px`);
        fontSizeVal.textContent = `${size}px`;
        saveSetting('fontSize', size);
        // 更新滚动位置
        if (currentLineIndex !== -1 && !audioPlayer.paused) {
            updateLyricsProgress();
        }
    });

    // 时间轴微调
    timelineOffsetInput.addEventListener('input', (e) => {
        timelineOffset = parseFloat(e.target.value);
        timelineOffsetVal.textContent = `${timelineOffset > 0 ? '+' : ''}${timelineOffset}s`;
        saveSetting('timelineOffset', timelineOffset);
    });
    
    // 解析 LRC (支持普通LRC和逐字LRC)
    function parseLRC(text) {
        try {
            const lines = text.split('\n');
            lyrics = [];
            
            // 解析元数据
            const tiMatch = text.match(/\[ti:(.*?)\]/);
            const arMatch = text.match(/\[ar:(.*?)\]/);
            
            let currentTitle = songTitleEl.textContent;
            let currentArtist = '未知歌手';

            if (tiMatch && tiMatch[1]) {
                currentTitle = tiMatch[1];
                songTitleEl.textContent = currentTitle;
            }
            if (arMatch && arMatch[1]) {
                currentArtist = arMatch[1];
                songArtistEl.innerHTML = `${currentArtist} <span class="tag">关注</span>`;
            }
            
            updateMediaSession(currentTitle, currentArtist);
            
            const timeRegExp = /\[(\d{2,}):(\d{2})(?:\.(\d{2,3}))?\]/g;
            let hasAnyLyrics = false;
            
            for (let line of lines) {
            line = line.trim();
            if (!line) continue;
            
            // 查找所有行级时间标签
            let match;
            const times = [];
            while ((match = timeRegExp.exec(line)) !== null) {
                const min = parseInt(match[1]);
                const sec = parseInt(match[2]);
                const ms = match[3] ? parseInt(match[3]) : 0;
                const time = min * 60 + sec + (match[3] && match[3].length === 2 ? ms * 0.01 : ms * 0.001);
                times.push(time);
            }
            
            let content = line.replace(timeRegExp, '').trim();
            
            if (content && times.length > 0) {
                // 检查是否有逐字时间标签，例如 <00:12.34>
                const wordTimeRegExp = /<(\d{2,}):(\d{2})(?:\.(\d{2,3}))?>([^<]*)/g;
                let words = [];
                let hasWordTimestamps = false;
                
                let wordMatch;
                while ((wordMatch = wordTimeRegExp.exec(content)) !== null) {
                    hasWordTimestamps = true;
                    const min = parseInt(wordMatch[1]);
                    const sec = parseInt(wordMatch[2]);
                    const ms = wordMatch[3] ? parseInt(wordMatch[3]) : 0;
                    const wordTime = min * 60 + sec + (wordMatch[3] && wordMatch[3].length === 2 ? ms * 0.01 : ms * 0.001);
                    const wordText = wordMatch[4];
                    
                    words.push({ time: wordTime, text: wordText });
                }
                
                // 如果有逐字标签，整理格式
                if (hasWordTimestamps) {
                    content = content.replace(/<\d{2,}:\d{2}(?:\.\d{2,3})?>/g, ''); // 纯文本
                }
                
                for (let time of times) {
                    hasAnyLyrics = true;
                    lyrics.push({ 
                        time, 
                        text: content, 
                        words: hasWordTimestamps ? words : null 
                    });
                }
            }
        }
        
        if (!hasAnyLyrics && lyrics.length === 0) {
            return false; // 没有解析到任何有效歌词
        }
        
        // 按时间排序
        lyrics.sort((a, b) => a.time - b.time);
        
        // 计算每行的持续时间
        for (let i = 0; i < lyrics.length; i++) {
            if (i < lyrics.length - 1) {
                lyrics[i].duration = lyrics[i + 1].time - lyrics[i].time;
            } else {
                lyrics[i].duration = 5; // 最后一行默认5秒
            }
            
            // 如果没有逐字时间，为了更好的卡拉OK效果，限制最大持续时间（防止长停顿导致填充太慢）
            if (!lyrics[i].words) {
                // 假设每个中文字符最多唱0.5秒，加上1秒缓冲
                const maxDuration = (lyrics[i].text.length * 0.5) + 1;
                lyrics[i].fillDuration = Math.min(lyrics[i].duration, maxDuration);
            }
        }
        
        renderLyrics();
        return true;
        } catch (e) {
            console.error("Lyrics parse error:", e);
            return false;
        }
    }
    
    // 渲染歌词
    function renderLyrics() {
        lyricsWrapper.innerHTML = '';
        if (lyrics.length === 0) {
            lyricsWrapper.innerHTML = '<div class="lyric-line placeholder">暂无歌词</div>';
            return;
        }
        
        lyrics.forEach((lyric, index) => {
            const div = document.createElement('div');
            div.className = 'lyric-line';
            div.id = `line-${index}`;
            
            if (lyric.words) {
                lyric.words.forEach(word => {
                    const span = document.createElement('span');
                    span.className = 'lyric-word';
                    span.dataset.text = word.text;
                    span.textContent = word.text;
                    div.appendChild(span);
                });
            } else {
                const chars = Array.from(lyric.text);
                chars.forEach(char => {
                    const span = document.createElement('span');
                    span.className = 'lyric-char';
                    span.dataset.text = char;
                    span.textContent = char;
                    div.appendChild(span);
                });
            }
            
            // 点击歌词跳转
            div.addEventListener('click', () => {
                audioPlayer.currentTime = lyric.time + timelineOffset;
                if (audioPlayer.paused) audioPlayer.play();
            });
            
            lyricsWrapper.appendChild(div);
        });
        
        // 初始化位置
        if (lyrics.length > 0) {
            currentLineIndex = -1;
            updateLyricsProgress();
        }
    }
    
    // 更新歌词进度和卡拉OK效果
    function updateLyricsProgress() {
        if (audioPlayer.paused && currentLineIndex !== -1 && !isDraggingProgress) {
            // allow update if dragging even if paused, but requestAnimationFrame handles running
        }
        
        // 应用时间轴微调
        const currentTime = audioPlayer.currentTime - timelineOffset;
        
        // 查找当前行
        let newCurrentLineIndex = -1;
        for (let i = 0; i < lyrics.length; i++) {
            if (currentTime >= lyrics[i].time && (i === lyrics.length - 1 || currentTime < lyrics[i + 1].time)) {
                newCurrentLineIndex = i;
                break;
            }
        }
        
        if (newCurrentLineIndex !== currentLineIndex) {
            // 移除旧行高亮
            if (currentLineIndex !== -1) {
                const prevLine = document.getElementById(`line-${currentLineIndex}`);
                if (prevLine) {
                    prevLine.classList.remove('active');
                    const spans = prevLine.querySelectorAll('span');
                    spans.forEach(span => span.style.setProperty('--progress', '0%'));
                }
            }
            
            currentLineIndex = newCurrentLineIndex;
            
            // 添加新行高亮并滚动
            if (currentLineIndex !== -1) {
                const currentLine = document.getElementById(`line-${currentLineIndex}`);
                if (currentLine) {
                    currentLine.classList.add('active');
                    
                    // 滚动到屏幕中间
                    // lyricsWrapper 在 top: 50%, 所以 translate 需要减去当前行相对于 wrapper 的 offsetTop 和其自身高度的一半
                    const offsetTop = currentLine.offsetTop;
                    const height = currentLine.offsetHeight;
                    lyricsWrapper.style.transform = `translateY(-${offsetTop + height / 2}px)`;
                }
            } else {
                // 回到顶部
                lyricsWrapper.style.transform = `translateY(0px)`;
            }
        }
        
        // 更新卡拉OK逐字/平滑填充效果
        if (currentLineIndex !== -1) {
            const currentLyric = lyrics[currentLineIndex];
            const currentLineEl = document.getElementById(`line-${currentLineIndex}`);
            
            if (currentLineEl) {
                if (currentLyric.words) {
                    const wordSpans = currentLineEl.querySelectorAll('.lyric-word');
                    let wordIndex = -1;
                    for (let i = 0; i < currentLyric.words.length; i++) {
                        if (currentTime >= currentLyric.words[i].time) {
                            wordIndex = i;
                        } else {
                            break;
                        }
                    }
                    
                    wordSpans.forEach((span, i) => {
                        if (i < wordIndex) {
                            span.style.setProperty('--progress', '100%');
                        } else if (i === wordIndex) {
                            const word = currentLyric.words[i];
                            const nextWordTime = (i < currentLyric.words.length - 1) ? 
                                                  currentLyric.words[i + 1].time : 
                                                  (currentLyric.time + currentLyric.duration);
                            
                            const wordDuration = nextWordTime - word.time;
                            const wordTimePassed = currentTime - word.time;
                            let wordProgress = 0;
                            if (wordDuration > 0) {
                                wordProgress = Math.max(0, Math.min(1, wordTimePassed / wordDuration)) * 100;
                            } else {
                                wordProgress = 100;
                            }
                            span.style.setProperty('--progress', `${wordProgress}%`);
                        } else {
                            span.style.setProperty('--progress', '0%');
                        }
                    });
                } else {
                    const charSpans = currentLineEl.querySelectorAll('.lyric-char');
                    const timePassed = currentTime - currentLyric.time;
                    let totalProgress = 0;
                    if (currentLyric.fillDuration > 0) {
                        totalProgress = Math.max(0, Math.min(1, timePassed / currentLyric.fillDuration));
                    } else {
                        totalProgress = 1;
                    }
                    
                    const totalChars = charSpans.length;
                    const targetCharIndexExact = totalProgress * totalChars;
                    const targetCharIndex = Math.floor(targetCharIndexExact);
                    const charProgress = (targetCharIndexExact - targetCharIndex) * 100;
                    
                    charSpans.forEach((span, i) => {
                        if (i < targetCharIndex) {
                            span.style.setProperty('--progress', '100%');
                        } else if (i === targetCharIndex) {
                            span.style.setProperty('--progress', `${charProgress}%`);
                        } else {
                            span.style.setProperty('--progress', '0%');
                        }
                    });
                }
            }
        }
        
        if (!audioPlayer.paused || isDraggingProgress) {
            animationFrameId = requestAnimationFrame(updateLyricsProgress);
        }
    }
    
    // 如果拖动进度条在暂停状态下，也更新歌词
    progressWrapper.addEventListener('mousemove', (e) => {
        if (isDraggingProgress && audioPlayer.paused) {
            updateLyricsProgress();
        }
    });
    
    // 上一首/下一首按钮事件绑定(占位)
    document.getElementById('prev-btn').addEventListener('click', () => {
        audioPlayer.currentTime = 0;
    });
    
    document.getElementById('next-btn').addEventListener('click', () => {
        if (audioPlayer.duration) {
            audioPlayer.currentTime = audioPlayer.duration;
        }
    });

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
        // 忽略输入框内的快捷键
        if (e.target.tagName.toLowerCase() === 'input') return;

        switch(e.code) {
            case 'Space':
                e.preventDefault();
                togglePlay();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                if (audioPlayer.duration) {
                    audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 5);
                }
                break;
            case 'ArrowRight':
                e.preventDefault();
                if (audioPlayer.duration) {
                    audioPlayer.currentTime = Math.min(audioPlayer.duration, audioPlayer.currentTime + 5);
                }
                break;
        }
    });
    
    function formatTime(seconds) {
        if (isNaN(seconds) || !isFinite(seconds)) return "00:00";
        const h = Math.floor(seconds / 3600);
        const min = Math.floor((seconds % 3600) / 60);
        const sec = Math.floor(seconds % 60);
        if (h > 0) {
            return `${h}:${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
        }
        return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    }

    // --- 音频可视化 (Web Audio API) ---
    function initVisualizer() {
        if (isVisualizerInit || !window.AudioContext && !window.webkitAudioContext) return;
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 128; // 获取 64 个频率数据
            
            sourceNode = audioCtx.createMediaElementSource(audioPlayer);
            sourceNode.connect(analyser);
            analyser.connect(audioCtx.destination);
            
            visualizerDataArray = new Uint8Array(analyser.frequencyBinCount);
            isVisualizerInit = true;
            
            resizeCanvas();
            window.addEventListener('resize', resizeCanvas);
            drawVisualizer();
        } catch (e) {
            console.error('音频可视化初始化失败:', e);
        }
    }

    let resizeTimer;
    function resizeCanvas() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (visualizerCanvas) {
                visualizerCanvas.width = visualizerCanvas.clientWidth;
                visualizerCanvas.height = visualizerCanvas.clientHeight;
            }
        }, 100);
    }

    function drawVisualizer() {
        requestAnimationFrame(drawVisualizer);
        if (!analyser || !canvasCtx || !visualizerCanvas) return;
        
        analyser.getByteFrequencyData(visualizerDataArray);
        
        const width = visualizerCanvas.width;
        const height = visualizerCanvas.height;
        
        canvasCtx.clearRect(0, 0, width, height);
        
        const barWidth = (width / visualizerDataArray.length) * 1.5;
        let barHeight;
        let x = 0;
        
        const activeColor = getComputedStyle(document.documentElement).getPropertyValue('--active-color').trim() || '#ffffff';
        
        // 极致体验：提取低频(Bass)能量，用于背景律动
        let bassSum = 0;
        const bassCount = Math.min(10, visualizerDataArray.length);
        for (let i = 0; i < bassCount; i++) {
            bassSum += visualizerDataArray[i];
        }
        const bassAvg = bassSum / (bassCount || 1);
        const dynamicBg = document.querySelector('.dynamic-bg');
        if (dynamicBg) {
            // 根据低音动态调整背景亮度，极具沉浸感
            dynamicBg.style.opacity = 0.3 + (bassAvg / 255) * 0.7;
        }

        // 极致体验：发光霓虹效果
        canvasCtx.shadowBlur = 15;
        canvasCtx.shadowColor = activeColor;
        
        for (let i = 0; i < visualizerDataArray.length; i++) {
            barHeight = (visualizerDataArray[i] / 255) * height;
            
            canvasCtx.fillStyle = activeColor;
            // 柱状图越低越透明
            canvasCtx.globalAlpha = 0.3 + (visualizerDataArray[i] / 255) * 0.7;
            
            // 绘制带有圆角的柱状图以提升质感
            canvasCtx.beginPath();
            if (canvasCtx.roundRect) {
                canvasCtx.roundRect(x, height - barHeight, barWidth - 2, barHeight, [4, 4, 0, 0]);
            } else {
                canvasCtx.fillRect(x, height - barHeight, barWidth - 2, barHeight);
            }
            canvasCtx.fill();
            
            x += barWidth;
        }
        canvasCtx.shadowBlur = 0;
        canvasCtx.globalAlpha = 1.0;
    }

    // --- 全屏模式 ---
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    showToast('全屏请求被拒绝', 'exclamation-triangle');
                });
                fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
                fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
            }
        });
    }

    // 监听全屏状态变化，更新图标
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement && fullscreenBtn) {
            fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
        }
    });

    // --- 音频错误处理 ---
    audioPlayer.addEventListener('error', (e) => {
        showToast('音频加载或播放出错，文件可能已损坏', 'exclamation-triangle');
        playIcon.className = 'fas fa-play';
        cancelAnimationFrame(animationFrameId);
    });

});