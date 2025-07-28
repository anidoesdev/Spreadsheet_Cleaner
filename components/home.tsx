"use client"

import { AppDispatch, RootState } from "@/store"
import { useEffect, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { setFile, setData, setValidationResult, setValidationRunning, clearValidation } from "@/store/dataSlice"
import Papa from "papaparse"
import * as XLSX from "xlsx"
import { schemas } from "@/lib/schemas"
import { validateData, getCellErrors, ValidationError, CrossEntityData } from "@/lib/validation"
import ValidationSummary from "./ValidationSummary"
import AISearch from "./AISearch"
import AICorrections from "./AICorrections"
import RuleBuilder from "./RuleBuilder"
import PrioritizationPanel from "./PrioritizationPanel"
import { AISearchResult } from "@/lib/aiEngine"
import { BusinessRule, generateRulesConfig } from "@/lib/ruleEngine"
import { PrioritizationConfig } from "@/lib/prioritizationEngine"


export default function Home() {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const dispatch = useDispatch<AppDispatch>();
    const {file, data, validationResult, isValidationRunning} = useSelector((state:RootState)=>state.data)
    const [entity, setEntity] = useState<string | null>(null);
    const [editedData, setEditedData] = useState<any[]>([])
    const [rowErrors,setRowErrors] = useState<Record<number,Record<string,string>>>({});
    const [selectedRow, setSelectedRow] = useState<number | null>(null);
    const [searchResult, setSearchResult] = useState<AISearchResult | null>(null);
    const [filteredData, setFilteredData] = useState<any[]>([]);
    const [crossEntityData, setCrossEntityData] = useState<CrossEntityData>({});
    const [businessRules, setBusinessRules] = useState<BusinessRule[]>([]);
    const [prioritizationConfig, setPrioritizationConfig] = useState<PrioritizationConfig | null>(null);
    const [activeSection, setActiveSection] = useState<'data' | 'rules' | 'prioritization'>('data');

    useEffect(()=>{
        if(entity && Array.isArray(data) && data.length > 0){
            const headers = Object.keys(data[0])
            const headerMap = mapHeaders(headers, entity)
            const normalizedData = remapDataRows(data, headerMap)
            dispatch(setData(normalizedData))
        }
    },[entity])
    useEffect(()=>{
        if(Array.isArray(data)) setEditedData(data)
    },[data])
    useEffect(()=>{
        if(Array.isArray(editedData) && entity){
            // Run comprehensive validation
            dispatch(setValidationRunning(true));
            
            // Use setTimeout to avoid blocking the UI
            setTimeout(() => {
                const result = validateData(editedData, entity, crossEntityData);
                dispatch(setValidationResult(result));
                dispatch(setValidationRunning(false));
                
                // Update row errors for inline validation
                const allErrors: Record<number,Record<string,string>> = {}
                editedData.forEach((row, idx)=>{
                    const errors = validate(row,entity)
                    if(Object.keys(errors).length > 0) allErrors[idx] = errors
                })
                setRowErrors(allErrors)
            }, 100);
        }
    },[editedData, entity, crossEntityData, dispatch])

    //inline editing
    function handleEditing(rowIdx: number, key: string, value: string){
        setEditedData((prev)=> prev.map((row,idx)=> idx === rowIdx ? {...row, [key]: value}: row))
        const newRow = {...editedData[rowIdx],[key]: value}
        const errors = validate(newRow, entity ?? "")
        setRowErrors((prev)=>({...prev,[rowIdx]:errors}))
    }
    
    function handleCellBlur(){
        dispatch(setData(editedData))
    }
    
    function handleErrorClick(error: ValidationError) {
        if (error.rowIndex !== undefined) {
            setSelectedRow(error.rowIndex);
            // Scroll to the row
            const rowElement = document.getElementById(`row-${error.rowIndex}`);
            if (rowElement) {
                rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }
    
    function handleSearchResult(result: AISearchResult) {
        setSearchResult(result);
        if (result.matchedRows.length > 0) {
            const filtered = result.matchedRows.map(index => editedData[index]);
            setFilteredData(filtered);
        } else {
            setFilteredData([]);
        }
    }
    
    function handleClearSearch() {
        setSearchResult(null);
        setFilteredData([]);
    }
    
    function handleApplyAISuggestions(newData: any[]) {
        setEditedData(newData);
        dispatch(setData(newData));
    }
    
    function updateCrossEntityData(entityType: string | null, data: any[]) {
        if (!entityType) return;
        
        setCrossEntityData(prev => ({
            ...prev,
            [entityType]: data
        }));
    }
    
    function handleRulesChange(rules: BusinessRule[]) {
        setBusinessRules(rules);
    }
    
    function handlePrioritizationChange(config: PrioritizationConfig) {
        setPrioritizationConfig(config);
    }
    
    function handleExportCleanData() {
        if (!Array.isArray(editedData) || editedData.length === 0) {
            alert('No data to export. Please upload and validate data first.');
            return;
        }
        
        if (!entity) {
            alert('Please select an entity type before exporting.');
            return;
        }
        
        try {
            // Generate CSV content
            const headers = Object.keys(editedData[0]);
            const csvContent = [
                headers.join(','),
                ...editedData.map(row => 
                    headers.map(header => {
                        const value = row[header] || '';
                        // Escape quotes and wrap in quotes if contains comma or newline
                        const escapedValue = value.toString().replace(/"/g, '""');
                        return escapedValue.includes(',') || escapedValue.includes('\n') 
                            ? `"${escapedValue}"` 
                            : escapedValue;
                    }).join(',')
                )
            ].join('\n');
            
            // Create and download file
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${entity}-clean-data.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log(`Exported ${editedData.length} rows of ${entity} data`);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed. Please try again.');
        }
    }

    function handleDrop(e:React.DragEvent<HTMLDivElement>){
        e.preventDefault()
        if(e.dataTransfer.files && e.dataTransfer.files.length > 0){
            handleFile(e.dataTransfer.files[0])
        }
    }
    function handleDragOver(e: React.DragEvent<HTMLDivElement>){
        e.preventDefault()
    }
    function handleFile(file: File){
        dispatch(setFile(file))
        const fileName = file.name.toLowerCase();
        if(fileName.endsWith(".csv")){
            Papa.parse(file,{
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    dispatch(setData(results.data))
                    dispatch(clearValidation())
                    if(results.data.length > 0){
                        const headers = Object.keys(results.data[0] as object)
                        const detected = detectEntity(headers)
                        setEntity(detected)
                        
                        // Update cross-entity data based on detected entity
                        updateCrossEntityData(detected, results.data)
                    }
                },
                error: (err) => {
                    alert("CSV parsing error: " + err.message)
                }
            })
        }else if ( fileName.endsWith(".xlsx") || fileName.endsWith(".xls")){
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = new Uint8Array(e.target?.result as ArrayBuffer)
                const workbook = XLSX.read(data, {type: "array"})
                const sheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, {defval: ""})
                dispatch(setData(jsonData))
                dispatch(clearValidation())
                if(jsonData.length > 0){
                    const headers = Object.keys(jsonData[0] as object)
                    const detected = detectEntity(headers)
                    setEntity(detected)
                    
                    // Update cross-entity data based on detected entity
                    updateCrossEntityData(detected, jsonData)
                }
            }
            reader.readAsArrayBuffer(file)
        }else{
            alert("Unsupported file type. Please upload a CSV or XLSX file.")
        }
    }

    function detectEntity(headers: string[]){
        const scores = Object.entries(schemas).map(([entity,fields])=>({
            entity,
            score: Object.keys(fields).filter(f => headers.some(h => h.toLowerCase().includes(f.toLowerCase()))).length,
        }))
        scores.sort((a,b) => b.score - a.score)
        if(scores[0].score === 0 || (scores[0].score === scores[1]?.score)){
            return null;
        }
        return scores[0].entity
    }
    function remapDataRows(data: any[], headerMap: Record<string,string>) {
        return data.map((row)=>{
            const newRow: Record<string,any> = {}
            Object.entries(row).forEach(([key, value])=>{
                const mappedKey = headerMap[key] || key;
                newRow[mappedKey] = value
            })
            return newRow
        })
    }
    function validate(row: any,entity: string){
        const errors: Record<string,string> = {}
        if(!entity) return errors;
        const requiredFields = Object.keys(schemas[entity as keyof typeof schemas])
        requiredFields.forEach((field)=>{
            if(!row[field] || row[field].toString().trim() === ""){
                errors[field] = "Required"
            }
            if(field === "email" && row[field]){
                if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(row[field])) {
                    errors[field] = "Invalid email";
                }
            }
        })
        return errors;
    }
    function mapHeaders(uploadHeader: string[], entity: string) {
        const entitySchema = schemas[entity as keyof typeof schemas]
        const headerMap: Record<string, string> = {}

        uploadHeader.forEach((header)=>{
            let found = false;
            for(const [canonical, variations] of Object.entries(entitySchema)){
                if(
                    variations.some((variant)=>variant.toLowerCase().replace(/\s+/g,"") ===
                     header.toLowerCase().replace(/\s+/g,""))
                ){
                    headerMap[header] = canonical
                    found = true
                    break
                }
            }
            if(!found){
                headerMap[header] = header
            }

        })
        return headerMap;
    }
  return (
    <main className="font-sans p-8 max-w-screen mx-auto bg-gray-900 min-h-screen text-gray-100">
      {/* Header */}
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold mb-3 text-white tracking-tight">AI Spreadsheet Cleaner</h1>
        <p className="text-gray-400 text-lg">
          Upload your messy CSV/XLSX files and let AI help you clean, validate, and export them with ease.
        </p>
      </header>

      {/* Upload Area */}
      <section className="mb-8 border border-gray-800 p-6 rounded-xl shadow-sm bg-gray-800 flex flex-col items-center"
       onDrop={handleDrop}
       onDragOver={handleDragOver}
      >
        <h2 className="text-lg font-semibold mb-3 text-gray-200">1. Upload Data</h2>
        <button className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition mb-2"
            onClick={()=>{
                fileInputRef.current?.click()
            }}
        >
          Upload CSV/XLSX
        </button>
        <input type="file" ref={fileInputRef} accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheet.sheet, application/vnd.ms-excel" className="hidden" 
        onChange={(e)=>{
            if(e.target.files && e.target.files.length > 0){
                handleFile(e.target.files[0])
            }
        }} />
         <div className="text-gray-500 text-sm mt-2">
          or <span className="underline">drag &amp; drop files here</span>
        </div>
        {file && (
          <div className="mt-4 text-green-400 text-sm">
            Selected file: {file.name}
          </div>
        )}
      </section>

      {/* Data Grid Placeholder */}
      <section className="mb-8 border border-gray-800 p-6 rounded-xl shadow-sm bg-gray-800">
        <h2 className="text-lg font-semibold mb-3 text-gray-200">2. Data Grid</h2>
        <div className="bg-gray-900 p-4 rounded-lg min-h-[100px] border border-dashed border-gray-700 overflow-x-auto">
          {Array.isArray(data) && data.length > 0 ? (
            <table className="min-w-full text-xs text-left text-gray-300">
              <thead>
                <tr>
                  {Object.keys(data[0]).map((key) => (
                    <th key={key} className="px-3 py-2 border-b border-gray-700 font-semibold">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(searchResult ? filteredData : editedData).map((row, idx) => {
                  const originalIndex = searchResult ? searchResult.matchedRows[idx] : idx;
                  const cellErrors = validationResult ? getCellErrors(validationResult.errors, originalIndex, '') : [];
                  const hasValidationErrors = cellErrors.length > 0;
                  const isSearchResult = searchResult && searchResult.matchedRows.includes(originalIndex);
                  
                  return (
                    <tr 
                      key={originalIndex} 
                      id={`row-${originalIndex}`}
                      className={`hover:bg-gray-800 transition-colors ${
                        selectedRow === originalIndex ? 'bg-blue-900/30 border-l-4 border-l-blue-500' : ''
                      } ${
                        hasValidationErrors ? 'bg-red-900/20 border-l-4 border-l-red-500' : ''
                      } ${
                        isSearchResult ? 'bg-green-900/20 border-l-4 border-l-green-500' : ''
                      }`}
                    >
                      {Object.keys(editedData[0]).map((key) => {
                        const cellValidationErrors = validationResult ? getCellErrors(validationResult.errors, originalIndex, key) : [];
                        const hasCellErrors = cellValidationErrors.length > 0;
                        
                        return (
                          <td key={key} className="px-3 py-2 border-b border-gray-800 relative">
                            <input
                              className={`bg-transparent text-gray-100 border-b w-full focus:outline-none ${
                                rowErrors[originalIndex]?.[key] || hasCellErrors
                                  ? "border-red-500"
                                  : "border-gray-700"
                              }`}
                              value={row[key] ?? ""}
                              onChange={(e) => handleEditing(originalIndex, key, e.target.value)}
                              onBlur={handleCellBlur}
                              title={rowErrors[originalIndex]?.[key] || cellValidationErrors.map(e => e.message).join(', ') || ""}
                            />
                            {(rowErrors[originalIndex]?.[key] || hasCellErrors) && (
                              <div className="text-xs text-red-400 mt-1">
                                {rowErrors[originalIndex]?.[key] || cellValidationErrors[0]?.message}
                                {cellValidationErrors.length > 1 && (
                                  <span className="text-gray-500 ml-1">(+{cellValidationErrors.length - 1} more)</span>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <em className="text-gray-600">Data grid will appear here after upload.</em>
          )}
        </div>
        {Array.isArray(data) && data.length > 0 && (
          <div className="mb-4">
            <label className="mr-2 text-gray-300">Entity type:</label>
            <select
              value={entity ?? ""}
              onChange={e => setEntity(e.target.value)}
              className="bg-gray-700 text-gray-100 rounded px-2 py-1"
            >
              <option value="">Select entity</option>
              <option value="client">Client</option>
              <option value="worker">Worker</option>
              <option value="task">Task</option>
            </select>
            {entity === null && (
              <span className="ml-2 text-yellow-400">Please select entity type</span>
            )}
          </div>
        )}
      </section>

      {/* Validator Panel */}
      <section className="mb-8 border border-gray-800 p-6 rounded-xl shadow-sm bg-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-200">3. Validation Results</h2>
          {isValidationRunning && (
            <div className="flex items-center gap-2 text-blue-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
              <span className="text-sm">Validating...</span>
            </div>
          )}
        </div>
        
        <ValidationSummary 
          validationResult={validationResult} 
          onErrorClick={handleErrorClick}
        />
      </section>

      {/* AI Features */}
      <section className="mb-8 border border-gray-800 p-6 rounded-xl shadow-sm bg-gray-800">
        <h2 className="text-lg font-semibold mb-3 text-gray-200">4. AI-Powered Features</h2>
        
        {/* Search Results Summary */}
        {searchResult && (
          <div className="mb-4 p-3 bg-green-900/20 border border-green-700 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="text-green-300">
                <span className="font-semibold">🔍 Search Results:</span> {searchResult.explanation}
              </div>
              <button
                onClick={handleClearSearch}
                className="text-green-400 hover:text-green-300 text-sm"
              >
                Clear Search
              </button>
            </div>
          </div>
        )}
        
        {/* Natural Language Search */}
        <div className="mb-6">
          <h3 className="text-md font-semibold mb-3 text-gray-200">Natural Language Search</h3>
          <AISearch 
            data={editedData}
            onSearchResult={handleSearchResult}
            onClearSearch={handleClearSearch}
          />
        </div>
        
        {/* AI Data Corrections */}
        <div>
          <h3 className="text-md font-semibold mb-3 text-gray-200">AI Data Corrections</h3>
          <AICorrections 
            data={editedData}
            entityType={entity || ''}
            onApplySuggestions={handleApplyAISuggestions}
          />
        </div>
      </section>

              {/* Business Rules Section */}
        <section className="mb-8 border border-gray-800 p-6 rounded-xl shadow-sm bg-gray-800">
          <h2 className="text-lg font-semibold mb-3 text-gray-200">5. Business Rules</h2>
          <RuleBuilder 
            data={crossEntityData}
            onRulesChange={handleRulesChange}
          />
        </section>

        {/* Prioritization Section */}
        <section className="mb-8 border border-gray-800 p-6 rounded-xl shadow-sm bg-gray-800">
          <h2 className="text-lg font-semibold mb-3 text-gray-200">6. Prioritization & Weights</h2>
          <PrioritizationPanel 
            clients={crossEntityData.clients || []}
            workers={crossEntityData.workers || []}
            tasks={crossEntityData.tasks || []}
            rules={businessRules}
            onConfigChange={handlePrioritizationChange}
          />
        </section>

        {/* Export Section */}
        <section className="border border-gray-800 p-6 rounded-xl shadow-sm bg-gray-800 flex flex-col items-center">
          <h2 className="text-lg font-semibold mb-3 text-gray-200">7. Export</h2>
          <div className="flex gap-3">
            <button className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                onClick={handleExportCleanData}
            >
              Export Clean Data
            </button>
            <button 
              onClick={() => {
                if (businessRules.length > 0) {
                  const config = generateRulesConfig(businessRules);
                  const blob = new Blob([config], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'business-rules.json';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }
              }}
              disabled={businessRules.length === 0}
              className="px-5 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export rules.json ({businessRules.length})
            </button>
          </div>
        </section>
    </main>
  )
}