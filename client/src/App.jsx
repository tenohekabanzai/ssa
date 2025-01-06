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
      console.log(resp_json.msg);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
      checkFile().then(i=> console.log("checked file"))
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
      link.click();       document.body.removeChild(link);
  
      window.URL.revokeObjectURL(url);
  
      setLoading(false); 
    } catch (error) {
      console.log('Error downloading ZIP:', error);
      setLoading(false); 
    }
  };

  const downloadSlip = async (i) => {

    const data = {
        name: i.name,
        email: i.email
    };

    try {
        setLoading(true); 
        const resp = await fetch('http://localhost:5001/downloadOne', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!resp.ok) {
            throw new Error('Network response was not ok');
        }

        const blob = await resp.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${i.email}_${i.name}.pdf`; 
        document.body.appendChild(a); 
        a.click(); 
        a.remove(); 
        window.URL.revokeObjectURL(url);
        
        setLoading(false); 
    } catch (error) {
        console.error('Error downloading PDF:', error);
        setLoading(false);   
    }
};

  return (
    <>
        <h1>Salary Slip Automator</h1>
        {loading && <h1>Loading...</h1>}
        {data && Array.isArray(data) && (
            <ul>
                {data.map((i, index) => (
                    <button 
                        key={index} 
                        onClick={() => downloadSlip(i)} 
                        disabled={loading} 
                    >
                        {i.name} {i.email}
                    </button>
                ))}
            </ul>
        )}
        <div className="card">
            <input 
                type="file" 
                name="file" 
                onChange={handleFileChange}  
                ref={fileInputRef} 
                disabled={loading} 
            />
            <button 
                onClick={uploadExcel} 
                disabled={loading || file == null} 
            >
                Upload Excel File
            </button>
        </div>
      <button onClick={sendEmails} disabled={loading || !data}>Send Emails</button>
        <button onClick={downloadZip} disabled={loading || !data}>Download all slips (zip)</button>
        {data ? <h5>File is uploaded to server</h5> : <h5>File is not uploaded to server</h5>}
    </>
  );

}

export default App
