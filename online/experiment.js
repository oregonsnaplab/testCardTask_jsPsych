/* 
Created by Teodora Vekony (vekteo@gmail.com)
MEMO Team (PI: Dezso Nemeth)
Lyon Neuroscience Research Center
Universite Claude Bernard Lyon 1

Github:https://github.com/vekteo/Wisconsin_JSPsych
*/

/*************** VARIABLES ***************/

// Full experiment.js with Google Sheets integration

let timeline = [];
const rules = ["color_rule", "shape_rule", "number_rule", "color_rule", "shape_rule", "number_rule", "color_rule"];
let actualRule = rules[0];
let numberOfCorrectResponses = 0;
let counter = 0;
let targetImages = [];
let totalErrors = 0;
let appliedRules = [];
const subjectId = jsPsych.randomization.randomID(15);

/*************** TIMELINE ELEMENTS ***************/

const instructions = {
    type: "instructions",
    pages: [
        `<h1>${language.welcomePage.welcome}</h1><br><p>${language.welcomePage.clickNext}</p>`,
        `<p>${language.instruction.fourCards}</p><p>${language.instruction.newCard}</p><p>${language.instruction.clickCard}</p><br><img src="../static/images/instruction.png" style="width: 500px"/></p><p style="color: #f6f6f8">Placeholder</p>`,
        `<p>${language.instruction.rule}</p><p>${language.instruction2.ruleChange}</p><p>${language.instruction2.ruleChange2}</p><br><img src="../static/images/instruction.png" style="width: 500px"/><p>${language.instruction2.clickNext}</p>`
    ],
    show_clickable_nav: true,
    data: { test_part: "instruction" },
    button_label_next: language.button.next,
    button_label_previous: language.button.previous
};

const endTask = {
    type: "html-keyboard-response",
    stimulus: function () {
        return `<h2>${language.end.end}</h2><br><p>${language.end.thankYou}</p>`;
    },
    trial_duration: 3000,
    data: { test_part: "end" },
    on_finish: function (trial) {
        statCalculation(trial);
    }
};

/*************** FUNCTIONS ***************/

function preloadImages() {
    for (let i = 1; i < 65; i++) {
        let targetCard = Object.values(cards).filter(card => card.trialNumber === i)[0];
        targetImages.push(targetCard.image);
    }
    return targetImages;
}

function addTrials(targetCard) {
    return {
        type: 'html-button-response',
        stimulus: `<h3>${language.task.instruction}</h3>`,
        choices: ["../static/images/triangle_red_1.png", "../static/images/star_green_2.png", "../static/images/diamond_yellow_3.png", "../static/images/circle_blue_4.png"],
        prompt: `<img class='choice' src='${targetCard.image}' />`,
        button_html: '<img class="topCards" src="%choice%" />',
        data: {
            test_part: "card",
            is_trial: true,
            card_number: targetCard.trialNumber,
            correct: "",
            image: targetCard.image,
            color: targetCard.color,
            shape: targetCard.shape,
            number: targetCard.number,
            color_rule: targetCard.colorRule,
            shape_rule: targetCard.shapeRule,
            number_rule: targetCard.numberRule,
            correct_in_row: 0
        },
        applied_rule: "",
        conditional_function: function () {
            return counter == 1;
        },
        on_finish: function (data) {
            let previousRule;
            let ruleToUse;

            if (actualRule == "color_rule") {
                ruleToUse = targetCard.colorRule;
                if (counter !== 0) previousRule = targetCard.numberRule;
            } else if (actualRule == "shape_rule") {
                ruleToUse = targetCard.shapeRule;
                previousRule = targetCard.colorRule;
            } else {
                ruleToUse = targetCard.numberRule;
                previousRule = targetCard.shapeRule;
            }

            data.correct_card = ruleToUse;
            data.number_of_rule = (counter % 3) + 1;
            data.category_completed = counter;

            if (parseInt(data.button_pressed) === ruleToUse) {
                data.correct = true;
                numberOfCorrectResponses++;
                data.perseverative_error = 0;
                data.non_perseverative_error = 0;
            } else {
                data.correct = false;
                numberOfCorrectResponses = 0;
                if (parseInt(data.button_pressed) == previousRule) {
                    data.perseverative_error = 1;
                    data.non_perseverative_error = 0;
                } else {
                    data.perseverative_error = 0;
                    data.non_perseverative_error = 1;
                }
            }

            data.correct_in_row = data.correct ? numberOfCorrectResponses : 0;
            if (!data.correct) totalErrors++;
            data.total_errors = totalErrors;
        }
    };
}

function addFeedback() {
    return {
        type: 'html-button-response',
        stimulus: `<h3>${language.task.instruction}</h3>`,
        choices: ["../static/images/triangle_red_1.png", "../static/images/star_green_2.png", "../static/images/diamond_yellow_3.png", "../static/images/circle_blue_4.png"],
        button_html: '<img class="topCards" src="%choice%" />',
        stimulus_duration: 750,
        trial_duration: 750,
        data: { test_part: "feedback" },
        prompt: function () {
            const last_trial_correct = jsPsych.data.get().last(1).values()[0].correct;
            return last_trial_correct
                ? `<p class="choice feedback" style='color: green; font-size: 5vh'>${language.feedback.correct}</p>`
                : `<p class="choice feedback" style='color: red; font-size: 5vh;'>${language.feedback.wrong}</p>`;
        }
    };
}

function addIfNoEnd(targetCard) {
    return {
        timeline: [addTrials(targetCard), addFeedback()],
        conditional_function: function () {
            return counter !== 7;
        }
    };
}

function CheckRestricted(src, restricted) {
    return !src.split("").some(ch => restricted.indexOf(ch) == -1);
}

function sendDataToGoogleSheet() {
    let sheetUrl = "https://script.google.com/macros/s/AKfycbzWZnGEOn1EBuDsriyITaf0L3w6ZcBfv178O3DUmMnbPgpDKFk8elMBX2pW28z2aI9IUw/exec";
    let csvData = jsPsych.data.get().csv();

    fetch(sheetUrl, {
        method: "POST",
        mode: "no-cors",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            data: csvData,
            subID: subjectId
        })
    }).then(() => {
        console.log("Data sent to Google Sheet");
    }).catch(error => {
        console.error("Error sending data:", error);
    });
}

/*************** TIMELINE ***************/

timeline.push({ type: "fullscreen", fullscreen_mode: true }, instructions);

for (let i = 1; i < 65; i++) {
    let targetCard = Object.values(cards).filter(card => card.trialNumber === i)[0];
    timeline.push(addIfNoEnd(targetCard));
}

jsPsych.data.addProperties({ subject: subjectId });
timeline.push(endTask, { type: "fullscreen", fullscreen_mode: false });

/*************** EXPERIMENT START AND DATA UPDATE ***************/

jsPsych.init({
    timeline: timeline,
    preload_images: preloadImages(),
    on_close: function () {
        // Optionally still save locally on premature close
        jsPsych.data.get().localSave('csv', `WCST_subject_${subjectId}_quitted_output.csv`);
    },
    on_data_update: function () {
        if (jsPsych.data.get().last(1).values()[0].is_trial === true) {
            const d = jsPsych.data;
            const n1 = d.get().filter({ is_trial: true }).last(1).values()[0];
            const n2 = d.get().filter({ is_trial: true }).last(2).values()[0];
            const n3 = d.get().filter({ is_trial: true }).last(3).values()[0];

            if (n1.trial_number > 1 && !n1.correct && n2.correct_in_row > 4 && n2.correct_in_row !== 10) {
                n1.failure_to_maintain = 1;
            } else {
                n1.failure_to_maintain = 0;
            }

            if (n1.button_pressed == n1.color_rule) appliedRules.push("C");
            if (n1.button_pressed == n1.shape_rule) appliedRules.push("S");
            if (n1.button_pressed == n1.number_rule) appliedRules.push("N");

            n1.applied_rules = appliedRules.join("");
            appliedRules = [];

            if (n2) {
                const isSame = CheckRestricted(n1.applied_rules, n2.applied_rules) || CheckRestricted(n2.applied_rules, n1.applied_rules);
                n1.perseverative_response = (!n1.correct && isSame) ? 1 : 0;
            } else {
                n1.perseverative_response = 0;
            }

            if (n3 && n1.correct && n2.correct && n3.correct) {
                n1.conceptual_level_response = 1;
            } else {
                n1.conceptual_level_response = 0;
            }
        }

        if (numberOfCorrectResponses === 10) {
            numberOfCorrectResponses = 0;
            counter++;
            actualRule = rules[counter];
        }

        let interactionData = jsPsych.data.getInteractionData();
        const lastTrialIndex = jsPsych.data.get().last(1).values()[0].trial_index;
        const interactionDataOfLastTrial = interactionData.filter({ trial: lastTrialIndex }).values();
        if (interactionDataOfLastTrial) {
            jsPsych.data.get().last(1).values()[0].browser_events = JSON.stringify(interactionDataOfLastTrial);
        }
    },
    on_finish: function () {
        sendDataToGoogleSheet(); // 🔁 Send to Google Sheets
    }
});
