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
app.use(express.json());
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

// api endpount to download all salary slips zipfiles on client-side
app.get('/downloadZip', async (req, res) => {
    try {
        // Generate PDFs
        for (const i of data) {
            i.paymentDate = formatDate(i.paymentDate);
            i.dateOfJoin = formatDate(i.dateOfJoin);

            const browser = await puppeteer.launch();
            const page = await browser.newPage();

            let htmlfile = createHTML("", i); 
            await page.setContent(htmlfile);
            const fn = `${i.email}_${i.name}.pdf`;
            const outputPath = path.join(__dirname, 'uploads', fn);
            await page.pdf({ path: outputPath, format: 'A4' });

            console.log('PDF generated for', `${i.name}`);
            await browser.close();
        }

        const zip = archiver('zip', {
            zlib: { level: 9 } 
        });

        
        res.attachment('pdfs.zip'); 
        res.setHeader('Content-Type', 'application/zip');

        
        zip.pipe(res);

        const pdfDir = path.join(__dirname, 'uploads');

        const files = await fsExtra.readdir(pdfDir);
        
        files.forEach(file => {
            if (path.extname(file) === '.pdf') {
                zip.file(path.join(pdfDir, file), { name: file });
                const filePath = path.join(pdfDir, file);
                    fsExtra.unlink(filePath, (err) => {
                        if (err) {
                            console.error(`Error deleting file ${file}:`, err);
                        } else {
                            console.log(`Deleted file: ${file}`);
                        }
                    });
            }
        });

        zip.finalize().then(() => {
            console.log("Zip generated");
        }).catch(err => {
            console.error('Error finalizing ZIP:', err);
            return res.status(500).send('Internal Server Error');
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// api endpount to download one salary slip pdf on client-side
app.post('/downloadOne', async (req, res) => {
    const { name, email } = req.body;
    const user = data.find(i => i.email === email);
    
    if (!user) {
        return res.status(404).json({ msg: "Email not found" });
    }

    user.paymentDate = formatDate(user.paymentDate);
    user.dateOfJoin = formatDate(user.dateOfJoin);

    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        const htmlfile = createHTML("", user);
        
        await page.setContent(htmlfile);

        const fn = `${user.email}_${user.name}.pdf`;
        const outputPath = path.join(__dirname, '/uploads', fn);

        await page.pdf({ path: outputPath, format: 'A4' });
        console.log('PDF generated for', user.name);
        await browser.close();

        return res.download(outputPath, fn, (err) => {
            if (err) {
                console.error('Error sending file:', err);
                res.status(500).send('Error sending file');
            } else {
                fsExtra.unlink(outputPath, (unlinkErr) => {
                    if (unlinkErr) {
                        console.error('Error deleting file:', unlinkErr);
                    } else {
                        console.log('PDF file deleted successfully');
                    }
                });
            }
        });
    } catch (err) {
        console.error('Error generating PDF:', err);
        return res.status(500).send('Error generating PDF');
    }
});

