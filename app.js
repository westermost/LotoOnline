// Global State Variables
var result = [];
var flgStop = false;
var numberLeft = 90;
var downloadTimer = null;
var synth = window.speechSynthesis;
var voices = [];
var stampsByCard = {};
var currentActiveCardId = null;

// Helper to check numeric value
function IsNumeric(n) {
    return !isNaN(n) && isFinite(n);
}

// Helper to check if item is in array
function inArray(needle, haystack) {
    var count = haystack.length;
    for (var i = 0; i < count; i++) {
        if (haystack[i] == needle) {
            return true;
        }
    }
    return false;
}

// Generate random number
function randomNum(numLow, numHigh) {
    var adjustedHigh = parseFloat(numHigh) - parseFloat(numLow) + 1;
    var numRand = Math.floor(Math.random() * adjustedHigh) + parseFloat(numLow);
    return numRand;
}

// Initialize the 1-90 Master Board
function initMasterBoard() {
    var board = document.getElementById("masterBoard");
    if (!board) return;
    board.innerHTML = "";
    
    var numLow = parseInt($("#lownumber").val()) || 1;
    var numHigh = parseInt($("#highnumber").val()) || 90;
    
    for (var i = numLow; i <= numHigh; i++) {
        var cell = document.createElement("div");
        cell.className = "board-cell";
        cell.id = "board-cell-" + i;
        cell.innerText = i;
        board.appendChild(cell);
    }
}

// Voice Synthesis System Initialization
function populateVoiceList() {
    if (typeof synth === 'undefined') return;
    voices = synth.getVoices();
    var select = document.getElementById('voiceSelect');
    if (!select) return;
    
    var selectedValue = select.value;
    select.innerHTML = '';
    
    // Sort: Vietnamese first, then English, then others
    var viVoices = voices.filter(function(v) { return v.lang.includes('vi') || v.lang.includes('VI'); });
    var enVoices = voices.filter(function(v) { return v.lang.includes('en') || v.lang.includes('EN'); });
    var otherVoices = voices.filter(function(v) { return !v.lang.includes('vi') && !v.lang.includes('VI') && !v.lang.includes('en') && !v.lang.includes('EN'); });
    
    var sortedVoices = viVoices.concat(enVoices).concat(otherVoices);
    
    if (sortedVoices.length === 0) {
        var op = document.createElement('option');
        op.textContent = 'Không có giọng đọc phù hợp';
        op.value = '';
        select.appendChild(op);
        return;
    }
    
    sortedVoices.forEach(function(voice) {
        var option = document.createElement('option');
        option.textContent = voice.name + ' (' + voice.lang + ')';
        option.value = voice.lang;
        option.setAttribute('data-voice-name', voice.name);
        
        // Select Vietnamese voice by default if available
        if (voice.lang.includes('vi') && !selectedValue) {
            option.selected = true;
        }
        
        select.appendChild(option);
    });
    
    if (selectedValue) {
        select.value = selectedValue;
    }
}

// Load voice list (handle async loading)
if (typeof synth !== 'undefined' && synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = populateVoiceList;
}

// Synthesize pleasant pop alert sound using Web Audio API
function playPopSound() {
    try {
        var ctx = new (window.AudioContext || window.webkitAudioContext)();
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.08); // G5
        
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    } catch(e) {
        console.log("Audio API blocked or not supported: ", e);
    }
}

// Synthesize stamp sound effect (add vs remove)
function playStampSound(isAdd) {
    try {
        var ctx = new (window.AudioContext || window.webkitAudioContext)();
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine';
        if (isAdd) {
            osc.frequency.setValueAtTime(700, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.05);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.15);
        } else {
            osc.frequency.setValueAtTime(350, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.2);
        }
    } catch(e) {
        console.log("Audio API blocked or not supported: ", e);
    }
}

// TTS speak number
function speakNumber(number) {
    var isEnabled = document.getElementById("voiceToggle").checked;
    if (!isEnabled || typeof synth === 'undefined') return;
    
    if (synth.speaking) {
        synth.cancel();
    }
    
    var msg = new SpeechSynthesisUtterance(number.toString());
    var selectedVoiceLang = $("#voiceSelect").val();
    
    if (selectedVoiceLang) {
        var selectedVoiceName = $("#voiceSelect option:selected").attr('data-voice-name');
        var voice = voices.find(function(v) { 
            return v.lang === selectedVoiceLang && v.name === selectedVoiceName; 
        });
        if (!voice) {
            voice = voices.find(function(v) { return v.lang === selectedVoiceLang; });
        }
        if (voice) {
            msg.voice = voice;
        }
    }
    
    msg.rate = parseFloat($("#voiceRate").val()) || 1.0;
    synth.speak(msg);
}

// Countdown timer mechanism
function countDown() {
    if (flgStop) {
        document.getElementById("countdown").innerHTML = "Đã tạm dừng kêu số";
        document.getElementById("countdown").classList.remove("running");
        return;
    }
    
    var totalTime = parseFloat($("#timeleft").val()) || 8;
    var timeleft = totalTime;
    
    // Setup visual SVG bar
    var strokeDash = 603; // Circumference of r=96 circle
    var bar = document.getElementById("countdownBar");
    if (bar) {
        bar.style.transition = 'none';
        bar.style.strokeDashoffset = 0;
        // trigger reflow
        bar.getBoundingClientRect();
        bar.style.transition = 'stroke-dashoffset 1s linear';
    }
    
    document.getElementById("countdown").innerHTML = "Kêu số tiếp theo sau " + timeleft + " giây";
    document.getElementById("countdown").classList.add("running");

    if (downloadTimer) {
        clearInterval(downloadTimer);
    }

    downloadTimer = setInterval(function() {
        timeleft -= 1;
        
        // Update SVG circle
        if (bar) {
            var offset = strokeDash * (1 - (timeleft / totalTime));
            bar.style.strokeDashoffset = offset;
        }
        
        if (timeleft <= 0) {
            clearInterval(downloadTimer);
            downloadTimer = null;
            if (!flgStop) {
                // Click Start button programmatically to call next number
                document.getElementById("getit").click();
            }
        } else if (flgStop) {
            clearInterval(downloadTimer);
            downloadTimer = null;
            document.getElementById("countdown").innerHTML = "Đã tạm dừng kêu số";
            document.getElementById("countdown").classList.remove("running");
            if (bar) bar.style.strokeDashoffset = 0;
        } else {
            document.getElementById("countdown").innerHTML = "Kêu số tiếp theo sau " + timeleft + " giây";
        }
    }, 1000);
}

// Pause/Stop mechanism
function stopCountDown() {
    flgStop = true;
    if (downloadTimer) {
        clearInterval(downloadTimer);
        downloadTimer = null;
    }
    
    document.getElementById("countdown").innerHTML = "Đã tạm dừng kêu số";
    document.getElementById("countdown").classList.remove("running");
    
    var bar = document.getElementById("countdownBar");
    if (bar) {
        bar.style.transition = 'none';
        bar.style.strokeDashoffset = 0;
    }
    
    $("#getit").removeClass("hidden");
    $("#stopit").addClass("hidden");
}

// In-page Reset / Clear mechanism
function clearScreen() {
    if (downloadTimer) {
        clearInterval(downloadTimer);
        downloadTimer = null;
    }
    
    result = [];
    flgStop = false;
    
    var numLow = parseInt($("#lownumber").val()) || 1;
    var numHigh = parseInt($("#highnumber").val()) || 90;
    numberLeft = numHigh - numLow + 1;
    
    // Reset stats labels
    $("#numberLeft").text("Còn lại: " + numberLeft);
    $("#numberhas").text("Đã kêu: 0");
    $("#result").html("Chưa có số nào được gọi.");
    
    // Reset call ball
    var ball = document.getElementById("bingoBallVisual");
    if (ball) ball.className = "bingo-ball empty";
    document.getElementById("randomnumber").innerText = "Sẵn sàng";
    
    // Reset timer
    document.getElementById("countdown").innerHTML = "Nhấn Bắt Đầu để chơi";
    document.getElementById("countdown").classList.remove("running");
    var bar = document.getElementById("countdownBar");
    if (bar) {
        bar.style.transition = 'none';
        bar.style.strokeDashoffset = 0;
    }
    
    // Reinitialize master board
    initMasterBoard();
    
    // Reset verify
    $("#findNumber").val("");
    var feedback = document.getElementById("checkFeedback");
    if (feedback) {
        feedback.className = "check-feedback";
        feedback.innerHTML = "";
    }
    
    // Reset buttons
    $("#getit").removeClass("hidden");
    $("#stopit").addClass("hidden");
}

// Search Verify number
function checkNumber() {
    var numberStr = $("#findNumber").val().trim();
    var number = parseInt(numberStr);
    var feedback = document.getElementById("checkFeedback");
    
    if (!feedback) return;
    
    if (!numberStr) {
        feedback.classList.remove("show", "success", "danger");
        feedback.innerHTML = "";
        return;
    }
    
    if (isNaN(number)) {
        feedback.innerHTML = "Vui lòng nhập số hợp lệ!";
        feedback.className = "check-feedback show danger";
        return;
    }
    
    var isCalled = inArray(number, result);
    
    if (isCalled) {
        feedback.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:6px;"><polyline points="20 6 9 17 4 12"></polyline></svg> Số <strong>${number}</strong> ĐÃ ĐƯỢC KÊU!`;
        feedback.className = "check-feedback show success";
        
        // Highlight cell flash glow
        var cell = document.getElementById("board-cell-" + number);
        if (cell) {
            cell.style.boxShadow = "0 0 25px rgba(16, 185, 129, 0.9)";
            cell.style.borderColor = "#10b981";
            setTimeout(function() {
                cell.style.boxShadow = "";
                cell.style.borderColor = "";
            }, 2500);
        }
    } else {
        feedback.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:6px;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Số <strong>${number}</strong> CHƯA KÊU!`;
        feedback.className = "check-feedback show danger";
    }
}

// Loto Card Stamps Overlay logic
function openCardModal(cardId) {
    currentActiveCardId = cardId;
    document.getElementById("modalCardTitle").innerText = "Vé Lô Tô Số " + cardId;
    document.getElementById("modalCardImg").src = "image/" + cardId + ".jpg";
    
    renderCardStamps();
    
    var modal = document.getElementById("cardModal");
    if (modal) modal.classList.add("show");
}

function closeCardModal() {
    var modal = document.getElementById("cardModal");
    if (modal) modal.classList.remove("show");
    currentActiveCardId = null;
}

function renderCardStamps() {
    var container = document.getElementById("interactiveContainer");
    if (!container) return;
    
    // Clear all existing markers
    var markers = container.querySelectorAll(".stamp-marker");
    markers.forEach(function(m) { m.remove(); });
    
    var stamps = stampsByCard[currentActiveCardId] || [];
    stamps.forEach(function(stamp, index) {
        var el = document.createElement("div");
        el.className = "stamp-marker";
        el.style.left = stamp.x + "%";
        el.style.top = stamp.y + "%";
        el.style.pointerEvents = "auto";
        el.title = "Click để xóa dấu";
        
        // Remove stamp on individual click
        el.onclick = function(e) {
            e.stopPropagation();
            removeStamp(index);
        };
        container.appendChild(el);
    });
}

function addStamp(xPercent, yPercent) {
    if (!currentActiveCardId) return;
    if (!stampsByCard[currentActiveCardId]) {
        stampsByCard[currentActiveCardId] = [];
    }
    stampsByCard[currentActiveCardId].push({ x: xPercent, y: yPercent });
    playStampSound(true);
    renderCardStamps();
}

function removeStamp(index) {
    if (!currentActiveCardId) return;
    if (stampsByCard[currentActiveCardId]) {
        stampsByCard[currentActiveCardId].splice(index, 1);
        playStampSound(false);
        renderCardStamps();
    }
}

function clearCurrentCardStamps() {
    if (currentActiveCardId) {
        stampsByCard[currentActiveCardId] = [];
        playStampSound(false);
        renderCardStamps();
    }
}

// JQuery ready entrypoint
$(function() {
    // Initial board setup
    initMasterBoard();
    
    // Initial voices setup
    populateVoiceList();
    
    // Listeners for ranges
    $("#lownumber, #highnumber").on("change", function() {
        clearScreen();
    });
    
    // Voice selection listener
    if (typeof synth !== 'undefined' && synth.onvoiceschanged !== undefined) {
        populateVoiceList();
    }
    
    // Listen for rate changes
    $("#voiceRate").on('input', function() {
        $("#rateVal").text($(this).val());
    });
    
    // Close modal when clicking outside
    $("#cardModal").on('click', function(e) {
        if (e.target === this) {
            closeCardModal();
        }
    });
    
    // Stamp click handler on the card container
    $("#interactiveContainer").on('click', function(e) {
        if (!currentActiveCardId) return;
        
        // Calculate coords relative to container
        var rect = this.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        
        var xPercent = (x / rect.width) * 100;
        var yPercent = (y / rect.height) * 100;
        
        addStamp(xPercent, yPercent);
    });

    // Start caller handler
    $("#getit").click(function() {
        // Toggle Buttons
        $("#getit").addClass("hidden");
        $("#stopit").removeClass("hidden");

        flgStop = false;

        var numLow = parseFloat($("#lownumber").val()) || 1;
        var numHigh = parseFloat($("#highnumber").val()) || 90;
        
        // Total possible numbers in selected range
        var totalCount = numHigh - numLow + 1;
        
        if (result.length >= totalCount) {
            $("#randomnumber").text("Hết");
            var ball = document.getElementById("bingoBallVisual");
            if (ball) ball.className = "bingo-ball empty";
            
            document.getElementById("countdown").innerText = "Đã kêu hết tất cả số!";
            $("#getit").removeClass("hidden");
            $("#stopit").addClass("hidden");
            return false;
        }

        var numRand = randomNum(numLow, numHigh);
        
        // Select next unique number
        var attempts = 0;
        while (inArray(numRand, result) && attempts < 1000) {
            numRand = randomNum(numLow, numHigh);
            attempts++;
        }

        if (
            IsNumeric(numLow) &&
            IsNumeric(numHigh) &&
            numLow <= numHigh
        ) {
            result.push(numRand);
            
            // Audio beeper
            playPopSound();

            // Speech synthesis
            speakNumber(numRand);

            var numberLeftCount = totalCount - result.length;

            $("#numberLeft").text("Còn lại: " + numberLeftCount);
            $("#numberhas").text("Đã kêu: " + result.length);
            
            // Update physical ball UI
            var ball = document.getElementById("bingoBallVisual");
            if (ball) {
                ball.className = "bingo-ball";
                ball.style.transform = "scale(0.8) rotate(-15deg)";
                setTimeout(function() {
                    $("#randomnumber").text(numRand);
                    ball.style.transform = "";
                }, 150);
            }

            // Sync master board called cells
            $(".board-cell").removeClass("last-called");
            var cell = document.getElementById("board-cell-" + numRand);
            if (cell) {
                cell.classList.add("called", "last-called");
            }

            // Sync log list
            var logHtml = result.map(function(n) {
                return '<span style="display:inline-block; background:rgba(255,255,255,0.06); border:1px solid var(--border-color); border-radius:4px; padding:2px 8px; margin:2px; font-weight:600; color:white;">' + n + '</span>';
            }).join("");
            $("#result").html(logHtml);
        }

        // Start countdown
        countDown();
        return false;
    });
});
