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
    
    let lyrics = [];
    let currentLineIndex = -1;
    let animationFrameId;
    let isDraggingProgress = false;
    let timelineOffset = 0;
    
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
                el.style.setProperty('--progress', '0%');
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
        const url = URL.createObjectURL(file);
        audioPlayer.src = url;
        songTitleEl.textContent = file.name.replace(/\.[^/.]+$/, "");
        songArtistEl.innerHTML = `未知歌手 <span class="tag">关注</span>`;
    }

    function handleLrcFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            parseLRC(text);
        };
        reader.readAsText(file);
    }

    // 拖拽上传
    document.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });

    document.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const files = e.dataTransfer.files;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type.startsWith('audio/')) {
                handleAudioFile(file);
            } else if (file.name.endsWith('.lrc') || file.name.endsWith('.txt')) {
                handleLrcFile(file);
            }
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
        const lines = text.split('\n');
        lyrics = [];
        
        // 解析元数据
        const tiMatch = text.match(/\[ti:(.*?)\]/);
        const arMatch = text.match(/\[ar:(.*?)\]/);
        
        if (tiMatch && tiMatch[1]) songTitleEl.textContent = tiMatch[1];
        if (arMatch && arMatch[1]) songArtistEl.innerHTML = `${arMatch[1]} <span class="tag">关注</span>`;
        
        const timeRegExp = /\[(\d{2,}):(\d{2})(?:\.(\d{2,3}))?\]/g;
        
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
                    lyrics.push({ 
                        time, 
                        text: content, 
                        words: hasWordTimestamps ? words : null 
                    });
                }
            }
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
            div.textContent = lyric.text;
            
            // 点击歌词跳转
            div.addEventListener('click', () => {
                audioPlayer.currentTime = lyric.time;
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
                    prevLine.style.setProperty('--progress', '0%');
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
                let progressPercent = 0;
                
                if (currentLyric.words) {
                    // 如果有逐字时间标签 (如Spotify/AppleMusic格式 LRC)
                    // 计算当前正在唱的字，以及它的进度
                    let wordIndex = -1;
                    for (let i = 0; i < currentLyric.words.length; i++) {
                        if (currentTime >= currentLyric.words[i].time) {
                            wordIndex = i;
                        } else {
                            break;
                        }
                    }
                    
                    if (wordIndex !== -1) {
                        const word = currentLyric.words[wordIndex];
                        const nextWordTime = (wordIndex < currentLyric.words.length - 1) ? 
                                              currentLyric.words[wordIndex + 1].time : 
                                              (currentLyric.time + currentLyric.duration);
                        
                        const wordDuration = nextWordTime - word.time;
                        const wordTimePassed = currentTime - word.time;
                        const wordProgress = Math.max(0, Math.min(1, wordTimePassed / wordDuration));
                        
                        // 计算基于字符总数的整体进度
                        const textLength = currentLyric.text.length;
                        
                        // 找到当前字在原文本中的位置
                        let charOffset = 0;
                        for(let i=0; i<wordIndex; i++) {
                            charOffset += currentLyric.words[i].text.length;
                        }
                        
                        const baseProgress = charOffset / textLength;
                        const currentWordProgress = (word.text.length / textLength) * wordProgress;
                        
                        progressPercent = (baseProgress + currentWordProgress) * 100;
                    }
                } else {
                    // 标准LRC，使用平滑过渡模拟逐字效果
                    const timePassed = currentTime - currentLyric.time;
                    progressPercent = (timePassed / currentLyric.fillDuration) * 100;
                }
                
                progressPercent = Math.max(0, Math.min(100, progressPercent));
                currentLineEl.style.setProperty('--progress', `${progressPercent}%`);
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