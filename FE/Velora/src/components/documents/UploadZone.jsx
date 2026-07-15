import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { IconUpload, IconFileText, IconMusic } from '@tabler/icons-react'

const CHAP_NHAN = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/mp4': ['.m4a'],
  'audio/webm': ['.webm'],
  'audio/ogg': ['.ogg'],
}

export default function UploadZone({ onUpload, isUploading }) {
  const onDrop = useCallback(files => {
    files.forEach(f => onUpload(f))
  }, [onUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: CHAP_NHAN, disabled: isUploading, maxFiles: 5,
  })

  return (
    <div {...getRootProps()} style={{
      ...styles.zone,
      background: isDragActive ? 'var(--bg-ai)' : 'var(--bg-elevated)',
      borderColor: isDragActive ? 'var(--accent-blue)' : 'var(--border)',
    }}>
      <input {...getInputProps()} />
      {isUploading
        ? <><div className="spinner" /><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Đang tải lên...</span></>
        : (
          <>
            <IconUpload size={24} style={{ color: isDragActive ? 'var(--accent-blue)' : 'var(--text-muted)' }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                {isDragActive ? 'Thả file vào đây' : 'Kéo thả file hoặc nhấn để chọn'}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-faint)' }}>PDF · DOCX · TXT · MP3 · WAV · M4A · WEBM</p>
            </div>
          </>
        )}
    </div>
  )
}

const styles = {
  zone: { border: '1.5px dashed', borderRadius: 10, padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'all .15s' },
}
