import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ValidationResult } from "@/lib/validation";

interface DataState {
    file: File | null;
    data: any;
    validationResult: ValidationResult | null;
    isValidationRunning: boolean;
}

const initialState: DataState = {
    file: null,
    data: null,
    validationResult: null,
    isValidationRunning: false,
}

export const dataSlice = createSlice({
    name: "data",
    initialState,
    reducers: {
        setFile: (state, action: PayloadAction<File> ) => {
            state.file = action.payload
        },
        setData: (state, action: PayloadAction<any> ) => {
            state.data = action.payload
        },
        setValidationResult: (state, action: PayloadAction<ValidationResult | null>) => {
            state.validationResult = action.payload
        },
        setValidationRunning: (state, action: PayloadAction<boolean>) => {
            state.isValidationRunning = action.payload
        },
        clearValidation: (state) => {
            state.validationResult = null
        }
    }
})

export const {setFile, setData, setValidationResult, setValidationRunning, clearValidation} = dataSlice.actions
export default dataSlice.reducer