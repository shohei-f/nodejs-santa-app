// define variables that reference elements on our page
const santaForm = document.forms[0];

// listen for the form to be submitted and add a new dream when it is
santaForm.onsubmit = (event) => {
  
  // -------------------
  // Input Data
  // -------------------
  let userid = document.getElementById('userid').value;
  let wish   = document.getElementById('wish').value;

  // -------------------
  // Validation Check
  // -------------------
  // blank check
  if (!userid)  {
    error_event(event, 'Enter your name.');
  }
  if (!wish)  {
    error_event(event, 'Enter the gift you want.');
  }
  
  // character count check
  if (wish.length > 100)  {
    error_event(event, 'Gifts should be written in 100chars or less.');
  }
  
};

/**
 * error handling
 * @param {*} event event 
 * @param {*} message error message
 */
function error_event(event, message) {
  alert(message);
  event.preventDefault();
}
