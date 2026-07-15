import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { IconUpload, IconFileText, IconMusic } from '@tabler/icons-react'
import { DOCUMENT_UPLOAD_ACCEPT, DOCUMENT_UPLOAD_MAX_FILES } from '../../constants/documentConstants'

export default function UploadZone({ onUpload, isUploading }) {
  const onDrop = useCallback(files => {
    files.forEach(f => onUpload(f))
  }, [onUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: DOCUMENT_UPLOAD_ACCEPT, disabled: isUploading, maxFiles: DOCUMENT_UPLOAD_MAX_FILES,
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
