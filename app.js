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

    // 播放/暂停控制
    playBtn.addEventListener('click', () => {
        if (!audioPlayer.src || audioPlayer.src.endsWith(window.location.href)) {
            settingsModal.classList.add('show');
            return;
        }
        if (audioPlayer.paused) {
            audioPlayer.play();
        } else {
            audioPlayer.pause();
        }
    });
    
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
    
    // 设置弹窗
    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('show');
    });
    
    closeSettings.addEventListener('click', () => {
        settingsModal.classList.remove('show');
    });
    
    // 加载音频
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
        const url = URL.createObjectURL(file);
        audioPlayer.src = url;
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
    function updateColor(input, valEl, cssVar) {
        input.addEventListener('input', (e) => {
            const color = e.target.value;
            document.documentElement.style.setProperty(cssVar, color);
            valEl.textContent = color;
        });
    }
    
    updateColor(bgColorInput, bgColorVal, '--bg-color');
    updateColor(inactiveColorInput, inactiveColorVal, '--inactive-color');
    updateColor(activeColorInput, activeColorVal, '--active-color');
    
    // 字体大小调节
    fontSizeInput.addEventListener('input', (e) => {
        const size = e.target.value;
        document.documentElement.style.setProperty('--lyric-font-size', `${size}px`);
        fontSizeVal.textContent = `${size}px`;
        // 更新滚动位置
        if (currentLineIndex !== -1 && !audioPlayer.paused) {
            updateLyricsProgress();
        }
    });

    // 时间轴微调
    timelineOffsetInput.addEventListener('input', (e) => {
        timelineOffset = parseFloat(e.target.value);
        timelineOffsetVal.textContent = `${timelineOffset > 0 ? '+' : ''}${timelineOffset}s`;
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
                if (!audioPlayer.src || audioPlayer.src.endsWith(window.location.href)) return;
                if (audioPlayer.paused) {
                    audioPlayer.play();
                } else {
                    audioPlayer.pause();
                }
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
        if (isNaN(seconds)) return "00:00";
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    }
});