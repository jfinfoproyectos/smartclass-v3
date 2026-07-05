"use client";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { exportToExcel, exportToCSV } from "@/lib/export-utils";

interface ExportButtonProps {
    data: any[];
    filename: string;
    sheetName?: string;
    variant?: "default" | "outline" | "ghost";
    size?: "default" | "sm" | "lg" | "icon";
}

export function ExportButton({
    data,
    filename,
    sheetName = "Datos",
    variant = "outline",
    size = "sm"
}: ExportButtonProps) {
    const handleExportExcel = () => {
        exportToExcel(data, filename, sheetName);
    };

    const handleExportCSV = () => {
        exportToCSV(data, filename);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant={variant} size={size}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportExcel}>
                    <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
                    Exportar a Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV}>
                    <FileText className="mr-2 h-4 w-4 text-blue-600" />
                    Exportar a CSV (.csv)
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
