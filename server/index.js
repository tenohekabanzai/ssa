const express = require('express');
const multer = require('multer');
const cors = require('cors');
const excelToJson = require('convert-excel-to-json');
const fsExtra = require('fs-extra');
const path = require('path');
const puppeteer = require('puppeteer');
const archiver = require('archiver');

require('dotenv').config();

const app = express();
const PORT = 5001;
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

var data = null;
var filePath = "";

const { sendPdfEmail, formatDate, createHTML, byptmapping,deleteFiles } = require('./utils');

app.listen(PORT, () => {
    console.log(`App running at http://localhost:${PORT}`);
});

app.get('/getdata', (req, res) => {

    if (data !== null) {
        let arr = [];
        for (const i of data) {
            arr.push({ name: i.name, email: i.email });
        }
        res.json({ msg: arr });
    } else {
        res.json({ msg: false });
    }
});

app.get('/', (req, res) => {
    res.render('homepage');
})

app.use('/files', express.static(path.join(__dirname, 'uploads')));

// api endpoint for mailing slip to every employee
app.post('/upload/bypt', async (req, res) => {
    if (data == undefined)
        res.json({ msg: "Upload file first" });
    try {
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

            try {
                // in sendPdfEmail set second parameter to i.email, here test email used for dev
                await sendPdfEmail(fn, `5022002a@gmail.com`);
            } catch (error) {
                console.log(error);
            }

            console.log(`Mail sent to ${i.name}'s email `);

            fsExtra.remove(fp);
            console.log('PDF cleared for', `${i.name}`);
            await browser.close();

        }
        fsExtra.remove(filePath);
        res.redirect("/")

    } catch (error) {
        console.log(error);
    }
})

// api endpoint to store excel data in server 
app.post('/uploadexcel', upload.single('file'), async (req, res) => {
    try {

        if (req.file == null || req.file.filename == 'undefined') {
            res.status(400).json("No file uploaded");
        }
        else {

            filePath = 'uploads/' + req.file.filename;
            const excelData = excelToJson({
                sourceFile: filePath,
                header: {
                    rows: 1
                },
                columnToKey: byptmapping
            });

            data = excelData.Sheet1;
        }
        fsExtra.remove(filePath);
        // console.log(data);
        res.json({ msg: "File uploaded successfully" })
    } catch (error) {
        console.log(error);
    }

})

async function deleteAllPdfs() {
    try {
        const pdfDir = path.join(__dirname, 'uploads');
        const files = await fsExtra.readdir(pdfDir);

        // Filter for PDF files and delete them
        for (const file of files) {
            if (path.extname(file) === '.pdf') {
                const filePath = path.join(pdfDir, file);
                await fsExtra.remove(filePath);  // Delete the PDF file
                console.log(`Deleted PDF: ${file}`);
            }
        }
    } catch (error) {
        console.error('Error deleting PDF files:', error);
    }
}

app.get('/downloadZip', async (req, res) => {

    try {

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
            await browser.close();
        }

        const zip = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level
        });

        // Set the response headers
        res.attachment('pdfs.zip'); // Set the name of the zip file
        res.setHeader('Content-Type', 'application/zip');

        // Pipe the zip stream to the response
        zip.pipe(res);

        // Specify the directory containing your PDF files
        const pdfDir = path.join(__dirname, 'uploads');

        // Append each PDF file in the directory to the zip
        fsExtra.readdir(pdfDir, (err, files) => {
            if (err) {
                console.error('Error reading directory:', err);
                return res.status(500).send('Internal Server Error');
            }

            // Filter for PDF files and append them to the zip
            files.forEach(file => {
                if (path.extname(file) === '.pdf') {
                    zip.file(path.join(pdfDir, file), { name: file });
                }
            });

            // Finalize the zip file (this is important)
            zip.finalize().catch(err => {
                console.error('Error finalizing ZIP:', err);
                return res.status(500).send('Internal Server Error');
            });
        });
        console.log("Zip generated");

        
    } catch (error) {
        console.log(error);
    }
});


