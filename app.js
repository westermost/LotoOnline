var result = [];
    var flgStop = false;

    function IsNumeric(n) {
        return !isNaN(n);
    }

    $(function() {
        $("#getit").click(function() {
            // hidden start button
            $("#getit").attr("hidden",true);

            var numLow = $("#lownumber").val();
            var numHigh = $("#highnumber").val();

            var numRand = randomNum(numLow, numHigh, result);

            while (inArray(numRand, result)) {
                if (result.length == numHigh) {
                    $("#randomnumber").text("Hết số rồi");
                    exit;
                }

                numRand = randomNum(numLow, numHigh);
            }

            if (
                IsNumeric(numLow) &&
                IsNumeric(numHigh) &&
                parseFloat(numLow) <= parseFloat(numHigh) &&
                numLow != "" &&
                numHigh != ""
            ) {
                result.push(numRand);
                // result.sort();

                var msg = new SpeechSynthesisUtterance(numRand);
                msg.lang = 'en-US';
                msg.rate = 1;
                window.speechSynthesis.speak(msg);


                $("#randomnumber").text(numRand);
                $("#result").text(result);
            }

            countDown();
            return false;
        });

        $("input[type=text]").each(function() {
            $(this).data("first-click", true);
        });

        $("input[type=text]").focus(function() {
            if ($(this).data("first-click")) {
                $(this).val("");
                $(this).data("first-click", false);
                $(this).css("color", "black");
            }
        });
    });

    function inArray(needle, haystack) {
        var count = haystack.length;
        for (var i = 0; i < count; i++) {
            if (haystack[i] == needle) {
                return true;
            }
        }
        return false;
    }

    function randomNum(numLow, numHigh) {
        var adjustedHigh = parseFloat(numHigh) - parseFloat(numLow) + 1;
        var numRand = Math.floor(Math.random() * adjustedHigh) + parseFloat(numLow);

        return numRand;
    }

    function countDown() {
        if (this.flgStop == false) {
            var timeleft = $("#timeleft").val();
            var downloadTimer = setInterval(function() {
                if (timeleft <= 0 && this.flgStop == false) {
                    clearInterval(downloadTimer);
                    // $(#getit).click();
                    document.getElementById("getit").click();
                } else if (this.flgStop == true) {
                    document.getElementById("countdown").innerHTML = "Đã có người kinh";
                } else {
                    document.getElementById("countdown").innerHTML = timeleft + " seconds remaining";
                }
                timeleft -= 1;
            }, 1000);
        } else {
            document.getElementById("countdown").innerHTML = "Đã có người kinh";
        }
    }

    function stopCountDown() {
        this.flgStop = true;
        $("#getit").removeAttr('hidden');
    }

    function clearScreen() {
        location.reload();
    }

    function checkNumber() {
        var number = $("#findNumber").val();
        // $("#textCheckNumber").attr("hidden",true);
        // $("#textCheckNumberWrong").attr("hidden",true);

        if(inArray(number, this.result))
        {
            $(".alert-success").removeAttr('hidden');
            document.getElementById("textCheckNumber").innerHTML = "Có số " + number;
        }
        else
        {
            $(".alert-danger").removeAttr('hidden');
            document.getElementById("textCheckNumberWrong").innerHTML = "Không Có Số " + number;
        }
    }
