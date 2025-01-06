const nodemailer = require('nodemailer');
const path = require('path');
const fsExtra = require('fs-extra');
const puppeteer = require('puppeteer');

const sendPdfEmail = async (x, email) => {

    console.log(__dirname);

    // set up transporter to send mail
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.sender_email, // email for testing purposes
            // allow two factor auth in google account security secn, and use app password 
            pass: process.env.sender_password // app password for this email
        }
    });
    // getting file pathname
    const pdfPath = path.join(__dirname, 'uploads', x);
    // ERROR HANDLING if file does not exist
    if (!fsExtra.existsSync(pdfPath)) {
        console.error('PDF file does not exist:', pdfPath);
        return;
    }

    // config for sending mail
    const mailOptions = {
        from: process.env.sender_email,
        to: email,
        subject: 'Here is your Salary Slip',
        text: 'Please find the attached PDF document.',
        attachments: [
            {
                filename: 'salary_slip.pdf',
                path: pdfPath
            }
        ]
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.response);
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

const formatDate = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

function deleteFiles(directory) {
    fsExtra.readdir(directory, (err, files) => {
        if (err) {
            console.error('Error reading directory:', err);
            return;
        }
        for (const file of files) {
            const filePath = path.join(directory, file);
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error(`Error deleting file ${file}:`, err);
                } else {
                    console.log(`File ${file} deleted successfully.`);
                }
            });
        }
    });
}

const generatePdfs = async (data) => {
    for (const i of data) {

        i.paymentDate = formatDate(i.paymentDate);
        i.dateOfJoin = formatDate(i.dateOfJoin);

        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        let htmlfile = "";
        htmlfile = createHTML(htmlfile, i);

        await page.setContent(htmlfile);
        const fn = `${i.email}_${i.name}.pdf`;
        const outputPath = path.join(__dirname, 'uploads', fn);
        const fp = 'uploads/' + fn;
        await page.pdf({ path: outputPath, format: 'A4' });

        console.log('PDF generated for', `${i.name}`);
    }
}

function generateFilteredEarningsDeductionsTable(earnings, deductions) {
    let html = `
        <table>
            <thead>
                <tr>
                    <th>Earnings</th>
                    <th>Amount</th>
                    <th>Deductions</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>`;

    const filteredEarnings = Object.entries(earnings).filter(([key, value]) => value !== 0);
    const filteredDeductions = Object.entries(deductions).filter(([key, value]) => value !== 0);

    const maxLength = Math.max(filteredEarnings.length, filteredDeductions.length);

    let totalEarnings = 0;
    let totalDeductions = 0;

    for (let i = 0; i < maxLength; i++) {
        const earning = filteredEarnings[i] || [];
        const deduction = filteredDeductions[i] || [];

        const earningAmount = earning[1] !== undefined ? earning[1] : 0;
        const deductionAmount = deduction[1] !== undefined ? deduction[1] : 0;

        totalEarnings += earningAmount;
        totalDeductions += deductionAmount;

        html += `
            <tr>
                <td>${earning[0] || ''}</td>
                <td>${earningAmount || ''}</td>
                <td>${deduction[0] || ''}</td>
                <td>${deductionAmount || ''}</td>
            </tr>`;
    }

    const totalIncome = totalEarnings - totalDeductions;

    html += `
            <tr>
                <td><strong>Total Earnings</strong></td>
                <td><strong>${totalEarnings}</strong></td>
                <td><strong>Total Deductions</strong></td>
                <td><strong>${totalDeductions}</strong></td>
            </tr>
            <tr>
                <td colspan="3"><strong>Total Income</strong></td>
                <td><strong>${totalIncome}</strong></td>
            </tr>
        </tbody>
    </table>`;

    return html;
}



const createHTML = (htmlfile, i) => {
    const date = new Date();
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const currentMonth = monthNames[date.getMonth()];

    const ear = {
        'BASIC': i.basic,
        'DA': i.da,
        'HRA': i.hra,
        'Conveyance': i.conveyance,
        'Medical': i.medical,
        'Children': i.children,
        'Bonus': i.bonus,
        'OT': i.ot,
        'VariablePay': i.variablePay, 
        'Incentive': i.incentive
    };

    const ded = {
        'PROFESSIONAL TAX': i.profTax,
        'TDS': i.tds,
        'Loan Deduction': i.loanDeduction,
        'Security': i.security
    };

    const table = generateFilteredEarningsDeductionsTable(ear,ded);

    htmlfile = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Salary Slip</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f9f9f9;
        }
        .container {
            width: 800px;
            margin: 20px auto;
            background: #f5f5f5;
            padding: 20px;
            border: 2px solid black;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        .header img {
            max-width: 150px;
            height: 120px;
            margin-bottom: 10px;
            border: 2px solid black;
        }
        .header h1 {
            font-size: 1.6em; /* Reduced by 20% */
        }
        .header h2 {
            font-size: 1.28em; /* Reduced by 20% */
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        table th, table td {
            border: 2px solid black;
            padding: 6px; /* Reduced padding to match text scaling */
            text-align: left;
            font-size: 0.8em; /* Reduced font size by 20% */
        }
        table th {
            background-color: #f4f4f4;
            font-weight: bold;
        }
        .footer {
            text-align: center;
            font-size: 11.2px; /* Reduced by 20% */
            color: #555;
        }
        .highlight {
            font-weight: bold;
            color: #333;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://bypeopletechnologies.com/wp-content/uploads/2017/01/byPeople-Logo.png" alt="Company Logo">
            <h1>byPeople Technologies</h1>
            <h2>Regd Office: Z-208, Dev Castle, Opp. Radhe Krishna Complex, Isanpur, Ahmedabad-382443</h2>
            <h2>Salary Slip for ${currentMonth}, ${date.getFullYear()}</h2>
        </div>

        <table>
            
            <tr>
                <td>Employee Name: <span class="highlight">${i.name}</span></td>
                <td>Email: <span class="highlight">${i.email}</span></td>
            </tr>
        </table>

         ${table}

        <table>
            <tr>
                <td>In Words: Rs.</td>
                <td><span class="highlight">${i.amtInWords}</span></td>
            </tr>
            <tr>
                <td>Approved Leaves: <span class="highlight">${i.approvedLeave}</span></td>
                <td>Unapproved Leaves: <span class="highlight">${i.unapprovedLeave}</span></td>
            </tr>
            <tr>
                <td>Present Days: <span class="highlight">${i.presentDays}</span></td>
                <td>Pay Days: <span class="highlight">${i.payDays}</span></td>
            </tr>
            <tr>
                <td colspan="2" style="text-align: center;">This is a computer-generated salary slip. Hence doesn’t require any signature.</td>
            </tr>
            <tr>
                <td colspan="2" style="text-align: center;">Thank You for your efforts</td>
            </tr>
        </table>

    </div>

    <!-- Render row function -->
    <script type="text/javascript">
      function renderRow(label, value) {
          const amountCell = value !== 0 ? value : ''; // Render value if not zero; otherwise, render an empty cell
          return \`<tr><td>\${label}</td><td>\${amountCell}</td><td></td><td></td></tr>\`; // Return a table row with earnings or deductions
      }
    </script>

</body>
</html>`;
   
    return htmlfile;
}


const byptmapping = {
    A: 'type',                // Type
    B: 'dateOfJoin',          // Date of Join
    C: 'name',                // Name
    D: 'email',               // Email
    E: 'grossSalary',         // Gross salary
    F: 'fixPay',              // Fix Pay
    G: 'basic',               // Basic
    H: 'da',                  // DA
    I: 'hra',                 // HRA
    J: 'conveyance',          // Conveyance
    K: 'medical',             // Medical
    L: 'children',            // Children
    M: 'total',               // TOTAL
    N: 'profTax',             // Prof. Tax
    O: 'ot',                  // OT
    P: 'reimbursement',        // Reimbursement
    Q: 'incentive',           // Incentive
    R: 'variablePay',         // Variable Pay
    S: 'totalEarning',        // Total Earning
    T: 'wfhHours',   // WFH Hours Deduction
    U: 'lessHours',   // Less Hours Deduction
    V: 'deduction',           // Deduction
    W: 'tds',                 // TDS
    X: 'loanDeduction',       // Loan Deduction
    Y: 'security',   // Security Deduction
    Z: 'total',      // Total Deduction
    AA: 'net',          // Net Salary
    AB: 'leaves',             // Leaves
    AC: 'bonus',        // Bonus Leaves
    AD: 'wfh_amt',           // WFH Hours 
    AE: 'ot_amy',            // OT Hours 
    AF: 'less_hours',          // Less Hours 
    AG: 'dailyPay',           // Daily pay 
    AH: 'hourlyPay',          // Hourly pay 
    AI: 'approvedLeave',      // Approved Leave 
    AJ: 'unapprovedLeave',    // Unapproved Leave 
    AK: 'absent',             // Absent 
    AL: 'presentDays',        // Present Days 
    AM: 'payDays',            // Pay days 
    AN: 'amtInWords',         // Amt In words 
    AO: 'designation',        // Designation 
    AP: 'accountNo',          // A/c No 
    AQ: 'adjustedLeaves',     // Adjusted Leaves 
    AR: 'totalBankAmount',     // total 
    AT: 'bankName',           // BANK 
    AU: 'modeOfPayment',      // MODE 
    AV: 'paidAmount',         // PAID AMT. 
    AW: 'adjustAmtC_B',       // Adjust Amt (C/B) 
    AX: 'actualPaidAmount',    // ACTUAL PAID  
    AY: 'paymentDate',         // PAYMENT DATE 
    AZ: 'totalSecurityDeposit',// Total Security Deposit 
    BA: 'remark'               // Remark  
}

module.exports = { sendPdfEmail, formatDate, deleteFiles, createHTML, byptmapping };