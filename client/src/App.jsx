import { useEffect, useState,useRef } from 'react'

import './App.css'

function App() {
  
  const [status, setStatus] = useState(false);
  
  const [data, setData] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const checkFile =async()=>{
    try {
      const resp = await fetch('http://localhost:5001/getdata');
      const resp_json = await resp.json();
      // console.log(resp_json.msg)
      setData(resp_json.msg)
    } catch (error) {
      console.log(error);
    }
  }

  
  useEffect(() => {
      checkFile()
  }, []);

  const uploadExcel = async()=>{
    if (!file) {
      alert('Please select a file before uploading.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file); 

    try {
      setLoading(true);
      const response = await fetch('http://localhost:5001/uploadexcel', { method: 'POST',body: formData });
      setLoading(false);
      if (response.ok) {
        setStatus(true);
        checkFile();

        fileInputRef.current.value = '';
        alert('File uploaded successfully!');
      } else {
        throw new Error('Failed to upload file.');
      }
      
    } catch (error) {
      console.error(error);
      alert('Error uploading file.');
    }
  }

  const handleFileChange = (event) => {
    // alert('File changed');
    setFile(event.target.files[0]); 
  };

  const sendEmails=async()=>{
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5001/upload/bypt', { method: 'POST'});
      setLoading(false);
      if (response.ok) {
        alert('Emails sent successfully');
        checkFile();
      } else {
        throw new Error('Failed to send emails.');
      }
      
    } catch (error) {
      console.error(error);
      alert('Error uploading file.');
    }
  }

  const downloadZip = async () => {
    try {
      setLoading(true);
  
      const response = await fetch('http://localhost:5001/downloadZip', {
        method: 'GET',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch the ZIP file');
      }
  
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'salary_slip_pdfs.zip'; 
      document.body.appendChild(link);
      link.click(); // Programmatically click the link to start the download
      document.body.removeChild(link);
  
      // Revoke the Object URL to release memory
      window.URL.revokeObjectURL(url);
  
      setLoading(false); // Stop loading state
    } catch (error) {
      console.log('Error downloading ZIP:', error);
      setLoading(false); // Stop loading state
    }
  };


  return (
    <>
      <h1>Salary Slip Automator</h1>
      {loading ? <h1>Loading!!!!!!!!!!!!!!</h1>:<></>}
      {data && Array.isArray(data) && (
        <ul>
          {data.map((i, index) => (
            <li key={index}>{i.name} {i.email}</li>
          ))}
        </ul>
      )}
      <div className="card">
      <input type="file" name="file" onChange={handleFileChange}  ref={fileInputRef}/>
      <button onClick={uploadExcel}>Upload Excel File</button>
      </div>
      <button onClick={sendEmails}>Send Emails</button>
      <button onClick={downloadZip}>Download all slips(zip)</button>
      {data ? <h5>File is uploaded to server</h5> : <h5>File is not uploaded to server</h5>}
    </>
  )
}

export default App
