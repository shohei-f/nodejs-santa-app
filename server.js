  // server.js

  // init project
  const express = require('express');
  const morgan = require('morgan');
  const app = express();
  const bodyParser = require('body-parser');
  const router = require('./routers/index');

  // URL
  const URL_USERS = 'https://raw.githubusercontent.com/alj-devops/santa-data/master/users.json';
  const URL_PROFS = 'https://raw.githubusercontent.com/alj-devops/santa-data/master/userProfiles.json';
  let notYetSentList = [];

  // send an email with information on all pending (not yet sent) requests
  setInterval(sendPendingList, 15000);

  app.use(bodyParser());
  app.use(morgan('dev'));
  app.use(router);
  app.use(express.static('public'));

  app.set('view engine', 'ejs');

  app.post('/send', (request, response) => {

    // body
    const userid = request.body.userid;
    const wish = request.body.wish;

    console.log(`POST /send\nuser:${userid}, wish:${wish}`);

    // get json
    const axios = require('axios');
    Promise.all([
      axios.get(URL_USERS),
      axios.get(URL_PROFS)
    ]).then(res => {

      // ------------------
      // User Information
      // ------------------
      // get users.json
      const users = res[0].data;
      console.log(`users:\n ${JSON.stringify(users)}`);

      // search user information
      const user = users.filter((row) => row.username == userid)[0];

      // existence check
      if (!user) {
        console.log(`Not Registered ${userid}`);
        error(response, 'Not Registered', request.body);
        return;
      }
      console.log(`Successful\n ${JSON.stringify(user)}`);

      // ------------------
      // User Profile
      // ------------------
      // get userProfiles.json
      const userprofs = res[1].data;
      console.log(`userprofs:\n ${JSON.stringify(userprofs)}`);

      // search user plofile
      const prof = userprofs.filter((row) => row.userUid == user.uid)[0];

      // existence check
      if (!prof) {
        console.log(`No User information ${userid}`);
        error(response, 'No User information', request.body);
        return;
      }
      console.log(`userprof:\n ${JSON.stringify(prof)}`);

      // -------------------
      // Age Check
      // -------------------
      let age = getAge(new Date(prof.birthdate));
      console.log(`age: ${age}`);

      // that the child is less than 10 years old
      if (age >= 10) {
        console.log(`Available only for children under 10 years old. your age: ${age}`);
        error(response, `Available only for children under 10 years old. your age: ${age}`, request.body);
        return;
      }

      // -------------------
      // normal termination
      // -------------------
      // TODO: double submit countermeasures
      notYetSentList.push({
        uid    : user.uid,
        wish   : wish,
        isSent : false
      });
      success(response, request.body);
      return;
    }).catch(err => {
      console.log(err);
      response.status(503).send('<h1>503 Contact the support desk.</h1>');
      return;
    });
  });

  // 404 
  app.use((req, res, next) => {
    res.status(404).send('<h1>404 not found</h1>');
  });

  // listen for requests :)
  const listener = app.listen(process.env.PORT || 3000, () => {
    console.log(`Your app is listening on port ${listener.address().port}`);

  });

  /**
   * calculate current age from current date and birthday
   * @param {*} birthDate 
   * @returns current age
   */
  function getAge(birthDate) {

    const nowDate = new Date();

    // birthdate this year
    const birthDateThisYear = new Date(nowDate.getFullYear(), birthDate.getMonth(), birthDate.getDate());

    // calculate age
    let age = nowDate.getFullYear() - birthDate.getFullYear();

    // not yet had a birthday
    if (birthDateThisYear > nowDate) {
      age--;
    }
    return age;
  }

  /**
   * error message
   * @param {*} response 
   * @param {*} message 
   * @param {*} body
   */
  function error(response, message, body) {
    response.render(
      'error', {
        error_msg: message,
        userid   : body.userid,
        wish     : body.wish
      }
    );
  }

  /**
   * success message
   * @param {*} response 
   * @param {*} body
   */
  function success(response, body) {
    response.render(
      'result', {
        userid: body.userid,
        wish  : body.wish
      }
    );
  }

  /**
   * send PendingList mail
   */
  function sendPendingList() {

    // existence check
    const list = notYetSentList.filter((row) => !row.isSent);
    console.log(list);
    if (list.length == 0) {
      console.log('No Pending List');
      return;
    }
    
    const axios = require('axios');
    Promise.all([
      axios.get(URL_USERS),
      axios.get(URL_PROFS)
    ]).then(res => {
      const users = res[0].data;
      const profs = res[1].data;
      
      let message = '<Wish List>\n\n';

      // get detailed user information
      list.forEach((child, index) => {
        // search user information
        const user = users.filter((row) => child.uid == row.uid)[0];
        // search user plofile
        const prof = profs.filter((row) => child.uid == row.userUid)[0];

        message += `username:${user.username}\naddress:${prof.address}\nwish:${child.wish}\n\n`;
        notYetSentList[index]['isSent'] = true;
        console.log(notYetSentList);
      });
      console.log(message);
      sendEmail(message);
    }).catch(err => {
      console.log(err);
    });
  }

  /**
   * send email
   * @param {*} message 
   */

  function sendEmail(message) {

    const nodemailer = require('nodemailer');
    nodemailer.createTestAccount((err, account) => {
      
      // create transporter
      let smtpConfig = {
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS
        }
      };
      let transporter = nodemailer.createTransport(smtpConfig);

      // message options
      let mailOptions = {
        from   : '<do_not_reply@northpole.com>',
        to     : 'santa@northpole.com',
        subject: 'Wish List',
        text   : message
      };
      
      //Send mail using created transport
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log(`Message sent: ${info.messageId}`);
        console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      });
    });
  }
