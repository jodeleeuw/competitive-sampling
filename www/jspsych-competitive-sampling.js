/*
 * Example plugin template
 */

jsPsych["competitive-sampling"] = (function() {

  var plugin = {};

  plugin.trial = function(display_element, trial) {

    // set default values for parameters
    trial.feedback_duration = trial.feedback_duration || 1500;

    var action_color = "#ddd";
    var action_font_color = "#555";
    var action_border_color = "#555";

    var enabled_color = "#ddd";
    var enabled_font_color = "#555";
    var enabled_border_color = "#555";

    var disabled_color = "#efefef";
    var disabled_font_color = "#ccc";
    var disabled_border_color = "#ccc";

    var mychoice_color = "#81d4fa";
    var mychoice_font_color = "#01579b";
    var mychoice_border_color = "#01579b";

    // store all choice data
    var turn_data = [];

    // store all sample data
    var sample_data = [];

    // allow variables as functions
    trial = jsPsych.pluginAPI.evaluateFunctionParameters(trial);

    function draw_html() {

      // create wait dialog
      var wait_html = '<dialog id="wait-dialog" class="mdl-dialog">'
      wait_html += '<div class="mdl-dialog__content">'
      wait_html += '<p>Waiting for other players to finish their turn.</p>'
      wait_html += '</div>'
      wait_html += '</dialog>'
      display_element.html(wait_html);
      var dialog = document.querySelector('#wait-dialog');
      if(!dialog.showModal){
        dialogPolyfill.registerDialog(dialog);
      }

      // create tie dialog
      var tie_html = '<dialog id="tie-dialog" class="mdl-dialog">'
      tie_html += '<div class="mdl-dialog__content">'
      tie_html += '<p>Someone else chose the same box as you, and they won the coin flip. You need to choose a different box.</p>'
      tie_html += '</div>'
      tie_html += '<div class="mdl-dialog__actions">'
      tie_html += '<button id="tie-dialog-ok" type="button" class="mdl-button">OK</button>'
      tie_html += '</div>'
      tie_html += '</dialog>'
      display_element.append(tie_html);
      var dialog = document.querySelector('#tie-dialog');
      dialog.querySelector('#tie-dialog-ok').addEventListener('click', function() {
        dialog.close();
      });
      if(!dialog.showModal){
        dialogPolyfill.registerDialog(dialog);
      }

      // display round information at the top
      var round_html = "<div id='jspsych-competitive-sampling-round-display'>";
      round_html += "<p>";
      if (trial.practice) {
        round_html += "<strong>Practice round</strong> ";
      } else {
        round_html += "Round ";
      }
      round_html += "number " + trial.round + " out of " + trial.total_rounds + " rounds</p>";
      round_html += "</div>";
      display_element.append(round_html);

      // display urns on the screen
      var urn_html = "<div id='jspsych-competitive-sampling-urns' style='display: flex; flex-flow: row wrap; width: 100%; justify-content: center;'>";
      for (var i = 0; i < trial.urns.length; i++) {
        urn_html += "<div class='jspsych-competitive-sampling-urn mdl-card mdl-shadow--2dp' data-urnid="+i+">";
        urn_html += "<div class='mdl-card__title mdl-card--expand'>";
        urn_html += "<h4 class='urn-title' style='text-align: center; width: 100%;'>Option " + trial.urns[i].label + "</h4>"
        urn_html += "</div>"
        urn_html += "<div class='mdl-card__supporting-text mdl-card--border urn-samples' data-urnid="+i+"><p>Sample history</p></div>"
        urn_html += "<div class='mdl-card__actions mdl-card--border' style='text-align: center;'>"
        urn_html += "<button class='mdl-button mdl-button--colored jspsych-competitive-sampling-sample-btn' data-urnid="+i+">Sample</button>"
        urn_html += "<button class='mdl-button mdl-button--colored jspsych-competitive-sampling-choose-btn' data-urnid="+i+">Choose</button>"
        urn_html += "</div></div>"
      }
      urn_html += "</div>"
      urn_html += "<div id='jspsych-competitive-sampling-sample-history' style='display:table-row;'></div>";
      urn_html += "</div>"

      display_element.append(urn_html);

      $('.jspsych-competitive-sampling-sample-btn').click(function(e){
       var id = $(this).data('urnid');
       sample(id);
      });

      $('.jspsych-competitive-sampling-choose-btn').click(function(e){
       var id = $(this).data('urnid');
       choose(id);
      });

      for (var i = 0; i < trial.urns.length; i++) {
        if (trial.urns[i].disabled === true || (Array.isArray(trial.urns[i].disabled) && trial.urns[i].disabled.indexOf(trial.player_id) > -1)) {
          disable_urn(i);
        }
      }
    }

    var sample_value = null;
    var urn_choice = null;
    var choice_value = null;

    draw_html();

    function sample(urn) {
      sample_value = trial.urns[urn].sample_function();
      sample_data.push({
        urn: urn,
        value: sample_value
      });
      var message = {
        player_id: trial.player_id,
        type: 'sample',
        urn: urn,
        value: sample_value
      };
      after_sample(message);
    }

    function choose(urn) {
      urn_choice = urn;
      var ev = trial.urns[urn].payoff();
      choice_value = ev;
      socket.emit('turn', {
        player_id: trial.player_id,
        type: 'choose',
        urn: urn,
        value: ev,
        random_num: Math.random()
      });
      wait_for_other_players();
    }

    function disable_urn(urn_id) {
      $('.jspsych-competitive-sampling-urn[data-urnid='+urn_id+'] button').attr('disabled', true);
    }

    function wait_for_other_players() {

      show_wait_screen();

      socket.once('turn-reply', function(data) {
        hide_wait_screen();

        turn_data.push(data.data);

        // check if two people chose the same urn
        var identical_choice = false;
        var choices_for_urns = [];
        for (var i = 0; i < trial.urns.length; i++) {
          choices_for_urns[i] = 0;
        }
        for (var i = 0; i < data.data.length; i++) {
          if (data.data[i].type == 'choose') {
            choices_for_urns[data.data[i].urn] = choices_for_urns[data.data[i].urn] + 1;
            if (choices_for_urns[data.data[i].urn] > 1) {
              identical_choice = true;
            }
          }
          if (data.data[i].type == 'choose') {
            disable_urn(data.data[i].urn);
            change_urn_text(data.data[i].urn, data.data[i].value);
          }
        }

        // did someone else choose my urn?
        if (choices_for_urns[urn_choice] > 1) {
          var my_rnd = -1;
          var max_rnd = -1;
          for (var i = 0; i < data.data.length; i++) {
            if (data.data[i].type == 'choose' && data.data[i].urn == urn_choice) {
              if (data.data[i].player_id == trial.player_id) {
                my_rnd = data.data[i].random_num;
              } else {
                max_rnd = Math.max(max_rnd, data.data[i].random_num);
              }
            }
          }
          if (my_rnd > max_rnd) {
            // I get to keep this urn
          } else {
            // Someone else got this urn
            urn_choice = null;
            choice_value = null;
            show_tie_dialog();
          }
        }

        var trial_complete = true;
        if (identical_choice) {
          trial_complete = false;
        }

        for (var i = 0; i < data.data.length; i++) {
          if (data.data[i].type == 'sample') {
            trial_complete = false;
          }
        }

        if (trial_complete == true) {
          after_round_ends();
        } else {
          if (urn_choice !== null) {
            socket.emit('turn', {
              player_id: trial.player_id,
              type: 'choose',
              urn: urn_choice,
              random_num: 10 // use something > 1 because this choice is locked in
            });
            wait_for_other_players();
          } else {
            if(!identical_choice){

            } // otherwise we have them clear the tie_dialog window.
          }
        }
      })
    }

    function change_urn_text(urn, text) {
      $("div[data-urnid=" + urn + "]").html(text);
    }

    function show_next_btn() {
      var next_btn = "<button id='jspsych-competitive-sampling-next-btn' class='mdl-button--colored'>Next Round</button>";
      display_element.append(next_btn);
      $('#jspsych-competitive-sampling-next-btn').on('click', function() {
        socket.once('wait-reply', function() {
          end_trial();
        });
        show_wait_screen();
        socket.emit('wait');
      });
    }

    function show_tie_dialog() {
      var dialog = document.querySelector('#tie-dialog');
      dialog.showModal();
    }

    function show_wait_screen() {
      var dialog = document.querySelector('#wait-dialog');
      dialog.showModal();
    }

    function hide_wait_screen() {
      var dialog = document.querySelector('#wait-dialog');
      dialog.close();
    }

    function after_sample(message) {

      render_sample_history();

      setTimeout(function() {
        socket.emit('turn', message);
        wait_for_other_players();
      }, trial.feedback_duration);
    }

    function after_round_ends() {

      // calculate payoff
      var opt = trial.urns[urn_choice].label;
      var value = choice_value;

      // show message
      var html = "<p style='font-size:24px;'>You chose option " + opt + ".</p><p style='font-size:24px;'>The value of your choice is " + value + ".</p>";

      // style choice
      $("div[data-urnid=" + urn_choice + "]").css({
        'border-color': mychoice_border_color,
        'color': mychoice_font_color,
        'background-color': mychoice_color
      }).hover(function(){
        $(this).css({
          'border-color': mychoice_border_color
        });
      });

      show_next_btn();
    }

    function render_sample_history() {

      var allurns = [];
      for (var i = 0; i < trial.urns.length; i++) {
        allurns.push([]);
      }

      for (var i = 0; i < sample_data.length; i++) {
        allurns[sample_data[i].urn].push(sample_data[i].value);
      }

      for (var i=0; i<allurns.length; i++){
        var html = "<p>No samples taken</p>";
        if(allurns[i].length > 0){
          html = "<p>"+allurns[i][0];
          for( var j = 1; j< allurns[i].length; j++){
            html += ", " + allurns[i][j];
          }
          html += "</p>";
          $('.urn-samples[data-urnid='+i+']').html(html);
        }
      }

    }

    function end_trial() {
      var trial_data = {
        urn_id: current_selection,
        choice_value: choice_value,
        turn_data: JSON.stringify(turn_data)
      };

      display_element.empty();

      // end trial
      jsPsych.finishTrial(trial_data);
    }
  };

  return plugin;
})();
