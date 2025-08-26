import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Progress } from './components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Separator } from './components/ui/separator';
import { Alert, AlertDescription } from './components/ui/alert';
import { Upload, FileText, Beaker, Download, Image, Scale, CheckCircle, AlertCircle } from 'lucide-react';

const API_BASE_URL = window.location.origin;

function App() {
  const [file, setFile] = useState(null);
  const [taskId, setTaskId] = useState(null);
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = useCallback((event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('請選擇PDF格式的檔案');
    }
  }, []);

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      setError(null);
    } else {
      setError('請選擇PDF格式的檔案');
    }
  }, []);

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
  }, []);

  const uploadFile = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setStatus('uploading');
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/api/patent/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setTaskId(data.task_id);
        setStatus('processing');
        pollStatus(data.task_id);
      } else {
        throw new Error(data.error || '上傳失敗');
      }
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  const pollStatus = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/patent/status/${id}`);
      const data = await response.json();

      if (response.ok) {
        setProgress(data.progress);
        setMessage(data.message);

        if (data.status === 'completed') {
          setStatus('completed');
          fetchResult(id);
        } else if (data.status === 'failed') {
          setStatus('error');
          setError(data.message);
        } else {
          setTimeout(() => pollStatus(id), 2000);
        }
      } else {
        throw new Error(data.error || '狀態查詢失敗');
      }
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  const fetchResult = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/patent/analyze/${id}`);
      const data = await response.json();

      if (response.ok) {
        setResult(data.result);
      } else {
        throw new Error(data.error || '結果獲取失敗');
      }
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  const downloadReport = async () => {
    if (!taskId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/patent/report/${taskId}`);
      const data = await response.json();

      if (response.ok) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `patent_analysis_report_${taskId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        throw new Error(data.error || '報告下載失敗');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const resetAnalysis = () => {
    setFile(null);
    setTaskId(null);
    setStatus('idle');
    setProgress(0);
    setMessage('');
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* 標題區域 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Beaker className="h-12 w-12 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">化學專利分析系統</h1>
          </div>
          <p className="text-lg text-gray-600">
            上傳有機化學專利PDF檔案，自動識別化學式、化學結構圖，並生成完整的專利分析報告
          </p>
        </div>

        {/* 上傳區域 */}
        {status === 'idle' && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="h-5 w-5 mr-2" />
                上傳專利檔案
              </CardTitle>
              <CardDescription>
                請選擇PDF格式的有機化學專利進行分析
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => document.getElementById('file-input').click()}
              >
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  {file ? file.name : '點擊選擇檔案'}
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  或拖拽PDF檔案到此區域
                </p>
                <p className="text-xs text-gray-400">
                  支援格式：PDF，最大檔案大小：50MB
                </p>
                <input
                  id="file-input"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
              
              {file && (
                <div className="mt-4 flex justify-center space-x-4">
                  <Button onClick={uploadFile} className="bg-blue-600 hover:bg-blue-700">
                    開始分析
                  </Button>
                  <Button variant="outline" onClick={() => setFile(null)}>
                    重新選擇
                  </Button>
                </div>
              )}
              
              {error && (
                <Alert className="mt-4 border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* 處理進度 */}
        {(status === 'uploading' || status === 'processing') && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>分析進度</CardTitle>
              <CardDescription>{message}</CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-gray-600 mt-2">{progress}% 完成</p>
            </CardContent>
          </Card>
        )}

        {/* 分析結果 */}
        {status === 'completed' && result && (
          <div className="space-y-6">
            {/* 分析摘要 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                  分析摘要
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {result.analysis_summary?.total_compounds || 0}
                    </div>
                    <div className="text-sm text-gray-600">化學式數量</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {result.analysis_summary?.total_structures || 0}
                    </div>
                    <div className="text-sm text-gray-600">化學結構數量</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {result.pages_processed || 0}
                    </div>
                    <div className="text-sm text-gray-600">分析頁數</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {result.images_extracted || 0}
                    </div>
                    <div className="text-sm text-gray-600">提取圖像數量</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 詳細結果 */}
            <Tabs defaultValue="formulas" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="formulas">化學式</TabsTrigger>
                <TabsTrigger value="structures">SMILES結構</TabsTrigger>
                <TabsTrigger value="claims">請求項分析</TabsTrigger>
                <TabsTrigger value="elements">專利要素</TabsTrigger>
                <TabsTrigger value="summary">分析總結</TabsTrigger>
              </TabsList>

              <TabsContent value="formulas" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>識別的化學式</CardTitle>
                    <CardDescription>
                      從專利文件中提取的化學分子式
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {result.chemical_formulas?.map((formula, index) => (
                        <Badge key={index} variant="secondary" className="text-sm">
                          {formula}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="structures" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>SMILES結構與圖片對照</CardTitle>
                    <CardDescription>
                      化學結構的SMILES表示法及其來源圖片
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {result.structure_image_pairs?.map((pair, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-semibold mb-2">SMILES結構</h4>
                              <code className="bg-gray-100 p-2 rounded text-sm block mb-2">
                                {pair.smiles}
                              </code>
                              <p className="text-sm text-gray-600 mb-1">
                                <strong>化合物：</strong>{pair.description}
                              </p>
                              <p className="text-sm text-gray-600 mb-1">
                                <strong>分子量：</strong>{pair.molecular_weight} g/mol
                              </p>
                              <p className="text-sm text-gray-600">
                                <strong>置信度：</strong>{(pair.confidence * 100).toFixed(1)}%
                              </p>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-2">來源圖片</h4>
                              <div className="border rounded p-2">
                                <img
                                  src={`data:image/${pair.image_data.format};base64,${pair.image_data.base64}`}
                                  alt={`化學結構 ${index + 1}`}
                                  className="max-w-full h-auto rounded"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  頁面 {pair.image_data.page} | 尺寸: {pair.image_data.width}×{pair.image_data.height}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="claims" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>請求項深度分析</CardTitle>
                    <CardDescription>
                      專利請求項的詳細分析和結構解析
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {result.claims_analysis && (
                      <div className="space-y-6">
                        {/* 請求項統計 */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                              {result.claims_analysis.total_claims || 0}
                            </div>
                            <div className="text-sm text-gray-600">總請求項數</div>
                          </div>
                          <div className="text-center p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                              {result.claims_analysis.independent_claims?.length || 0}
                            </div>
                            <div className="text-sm text-gray-600">獨立請求項</div>
                          </div>
                          <div className="text-center p-4 bg-purple-50 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">
                              {result.claims_analysis.dependent_claims?.length || 0}
                            </div>
                            <div className="text-sm text-gray-600">從屬請求項</div>
                          </div>
                          <div className="text-center p-4 bg-orange-50 rounded-lg">
                            <div className="text-2xl font-bold text-orange-600">
                              {result.claims_analysis.claim_structure?.complexity_score?.toFixed(1) || 0}
                            </div>
                            <div className="text-sm text-gray-600">複雜度分數</div>
                          </div>
                        </div>

                        <Separator />

                        {/* 技術範圍 */}
                        <div>
                          <h4 className="font-semibold mb-2">技術範圍</h4>
                          <p className="text-gray-700 bg-gray-50 p-3 rounded">
                            {result.claims_analysis.technical_scope || '技術範圍分析中...'}
                          </p>
                        </div>

                        {/* 關鍵特徵 */}
                        {result.claims_analysis.key_features?.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-2">關鍵技術特徵</h4>
                            <div className="space-y-2">
                              {result.claims_analysis.key_features.slice(0, 5).map((feature, index) => (
                                <div key={index} className="bg-blue-50 p-2 rounded text-sm">
                                  {feature}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 請求項中的化學化合物 */}
                        {result.claims_analysis.chemical_compounds_in_claims?.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-2">請求項中的化學化合物</h4>
                            <div className="flex flex-wrap gap-2">
                              {result.claims_analysis.chemical_compounds_in_claims.map((compound, index) => (
                                <Badge key={index} variant="outline" className="text-sm">
                                  {compound}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="elements" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>專利要素</CardTitle>
                    <CardDescription>
                      從專利文件中提取的關鍵資訊
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(result.patent_elements || {}).map(([key, value]) => (
                        <div key={key}>
                          <h4 className="font-semibold capitalize mb-2">
                            {key === 'title' ? '標題' : 
                             key === 'abstract' ? '摘要' : 
                             key === 'inventors' ? '發明人' : 
                             key === 'claims' ? '請求項' : key}
                          </h4>
                          <p className="text-gray-700 bg-gray-50 p-3 rounded text-sm">
                            {value || '未找到相關資訊'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="summary" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>分析總結</CardTitle>
                    <CardDescription>
                      專利的整體評估和建議
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold mb-2">專利強度評估</h4>
                          <Badge 
                            variant={
                              result.analysis_summary?.patent_strength === '高' ? 'default' :
                              result.analysis_summary?.patent_strength === '中等' ? 'secondary' : 'outline'
                            }
                            className="text-sm"
                          >
                            {result.analysis_summary?.patent_strength || '未評估'}
                          </Badge>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">新穎性評估</h4>
                          <Badge variant="outline" className="text-sm">
                            {result.analysis_summary?.novelty_assessment || '需進一步評估'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold mb-2">化合物類型</h4>
                        <div className="flex flex-wrap gap-2">
                          {result.analysis_summary?.compound_types?.map((type, index) => (
                            <Badge key={index} variant="secondary" className="text-sm">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* 操作按鈕 */}
            <div className="flex justify-center space-x-4">
              <Button onClick={downloadReport} className="bg-green-600 hover:bg-green-700">
                <Download className="h-4 w-4 mr-2" />
                下載完整報告
              </Button>
              <Button variant="outline" onClick={resetAnalysis}>
                分析新檔案
              </Button>
            </div>
          </div>
        )}

        {/* 錯誤狀態 */}
        {status === 'error' && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-700 flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                分析失敗
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600 mb-4">{error}</p>
              <Button variant="outline" onClick={resetAnalysis}>
                重新開始
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default App;

