import { useState } from 'react'
import { Upload, FileText, Beaker, Download, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Progress } from '@/components/ui/progress.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import './App.css'

function App() {
  const [file, setFile] = useState(null)
  const [taskId, setTaskId] = useState(null)
  const [status, setStatus] = useState('idle') // idle, uploading, processing, completed, error
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const API_BASE = '/api/patent'

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0]
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile)
      setError(null)
    } else {
      setError('請選擇PDF檔案')
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('請先選擇檔案')
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    try {
      setStatus('uploading')
      setError(null)
      setMessage('上傳檔案中...')

      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setTaskId(data.task_id)
        setStatus('processing')
        setMessage('開始分析...')
        pollStatus(data.task_id)
      } else {
        throw new Error(data.error || '上傳失敗')
      }
    } catch (err) {
      setStatus('error')
      setError(err.message)
    }
  }

  const pollStatus = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/status/${id}`)
      const data = await response.json()

      if (response.ok) {
        setProgress(data.progress)
        setMessage(data.message)

        if (data.status === 'completed') {
          // 獲取分析結果
          const resultResponse = await fetch(`${API_BASE}/analyze/${id}`)
          const resultData = await resultResponse.json()

          if (resultResponse.ok) {
            setResult(resultData.result)
            setStatus('completed')
            setMessage('分析完成')
          } else {
            throw new Error(resultData.error || '獲取結果失敗')
          }
        } else if (data.status === 'failed') {
          throw new Error(data.message || '分析失敗')
        } else {
          // 繼續輪詢
          setTimeout(() => pollStatus(id), 2000)
        }
      } else {
        throw new Error(data.error || '狀態查詢失敗')
      }
    } catch (err) {
      setStatus('error')
      setError(err.message)
    }
  }

  const downloadReport = async () => {
    if (!taskId) return

    try {
      const response = await fetch(`${API_BASE}/report/${taskId}`)
      const data = await response.json()

      if (response.ok) {
        // 將報告數據轉換為JSON檔案下載
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `patent-analysis-report-${taskId.slice(0, 8)}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else {
        throw new Error(data.error || '報告生成失敗')
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const reset = () => {
    setFile(null)
    setTaskId(null)
    setStatus('idle')
    setProgress(0)
    setMessage('')
    setResult(null)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Beaker className="h-12 w-12 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">化學專利分析系統</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            上傳有機化學專利PDF檔案，自動識別化學式、化學結構圖，並生成完整的專利分析報告
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          {/* Upload Section */}
          {status === 'idle' && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="h-5 w-5 mr-2" />
                  上傳專利檔案
                </CardTitle>
                <CardDescription>
                  請選擇PDF格式的有機化學專利檔案進行分析
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium"
                    >
                      點擊選擇檔案
                    </label>
                    <p className="text-gray-500 mt-2">或拖拽PDF檔案到此處</p>
                    <p className="text-sm text-gray-400 mt-2">支援格式：PDF，最大檔案大小：50MB</p>
                  </div>

                  {file && (
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-green-600 mr-2" />
                        <span className="text-green-800 font-medium">{file.name}</span>
                        <Badge variant="secondary" className="ml-2">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </Badge>
                      </div>
                      <Button onClick={handleUpload} className="bg-blue-600 hover:bg-blue-700">
                        開始分析
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Processing Section */}
          {(status === 'uploading' || status === 'processing') && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 animate-spin" />
                  分析進行中
                </CardTitle>
                <CardDescription>
                  正在處理您的專利檔案，請稍候...
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Progress value={progress} className="w-full" />
                  <p className="text-center text-gray-600">{message}</p>
                  <div className="text-center">
                    <Button variant="outline" onClick={reset}>
                      取消分析
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results Section */}
          {status === 'completed' && result && (
            <div className="space-y-6">
              {/* Analysis Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                    分析完成
                  </CardTitle>
                  <CardDescription>
                    專利分析已完成，以下是分析結果摘要
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {result.analysis_summary.total_compounds}
                      </div>
                      <div className="text-sm text-gray-600">化學式</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {result.analysis_summary.total_structures}
                      </div>
                      <div className="text-sm text-gray-600">化學結構</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {result.analysis_summary.pages_analyzed}
                      </div>
                      <div className="text-sm text-gray-600">分析頁數</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {result.analysis_summary.images_found}
                      </div>
                      <div className="text-sm text-gray-600">提取圖像</div>
                    </div>
                  </div>
                  <div className="flex justify-center space-x-4">
                    <Button onClick={downloadReport} className="bg-green-600 hover:bg-green-700">
                      <Download className="h-4 w-4 mr-2" />
                      下載完整報告
                    </Button>
                    <Button variant="outline" onClick={reset}>
                      分析新檔案
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Chemical Formulas */}
              {result.chemical_formulas.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>識別的化學式</CardTitle>
                    <CardDescription>
                      從專利文件中提取的化學分子式
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {result.chemical_formulas.map((formula, index) => (
                        <Badge key={index} variant="secondary" className="text-sm">
                          {formula}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* SMILES Structures */}
              {result.smiles_structures.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>SMILES結構式</CardTitle>
                    <CardDescription>
                      從化學結構圖轉換的SMILES表示法
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {result.smiles_structures.map((smiles, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg font-mono text-sm">
                          {smiles}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Patent Elements */}
              {Object.keys(result.patent_elements).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>專利要素</CardTitle>
                    <CardDescription>
                      從專利文件中提取的關鍵資訊
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(result.patent_elements).map(([key, value]) => (
                        <div key={key}>
                          <h4 className="font-medium text-gray-900 mb-1 capitalize">
                            {key === 'title' ? '標題' :
                             key === 'abstract' ? '摘要' :
                             key === 'claims' ? '請求項' :
                             key === 'inventors' ? '發明人' :
                             key === 'applicant' ? '申請人' :
                             key === 'description' ? '說明' : key}
                          </h4>
                          <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg">
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Error Section */}
          {error && (
            <Alert className="mb-8 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  )
}

export default App

