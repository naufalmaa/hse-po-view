import sys
import os

try:
    import openpyxl
except ImportError:
    import subprocess
    # Automatically install openpyxl if not present
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "openpyxl"])
    except subprocess.CalledProcessError:
        try:
            # Fallback for externally-managed environments (PEP 668 on modern Linux/Debian)
            subprocess.check_call([sys.executable, "-m", "pip", "install", "openpyxl", "--break-system-packages"])
        except subprocess.CalledProcessError:
            print("Error: Could not install openpyxl automatically.")
            sys.exit(1)
    import openpyxl

from openpyxl.chart import PieChart, BarChart, Reference
from openpyxl.chart.label import DataLabelList
from openpyxl.chart.series import DataPoint

def add_charts(file_path):
    wb = openpyxl.load_workbook(file_path)
    
    # 1. Find the visible rekap worksheet where charts will be displayed
    ws_charts = None
    for name in wb.sheetnames:
        if name.lower().startswith("rekap monitoring"):
            ws_charts = wb[name]
            break
            
    if ws_charts is None:
        print("Error: Rekap sheet not found")
        return
        
    # 2. Get the hidden data worksheet
    if 'CSMS_Chart_Data' not in wb.sheetnames:
        print("Error: CSMS_Chart_Data sheet not found")
        return
    ws_data = wb['CSMS_Chart_Data']
    
    # 3. Create Pie Chart (Status Kontrak)
    # Data is in CSMS_Chart_Data sheet!
    # Labels: col 1 (A), row 2-3 ("Kontrak Berjalan", "Kontrak Berakhir")
    # Data: col 2 (B), row 1-3 ("JUMLAH", runningContracts, endedContracts)
    pie = PieChart()
    labels = Reference(ws_data, min_col=1, min_row=2, max_row=3)
    data = Reference(ws_data, min_col=2, min_row=1, max_row=3)
    pie.add_data(data, titles_from_data=True)
    pie.set_categories(labels)
    pie.title = "Kontrak P&O"
    pie.width = 12
    pie.height = 9
    
    # Custom color points for Pie: Berjalan (Green) vs Berakhir (Red)
    if len(pie.series) > 0:
        slice_berjalan = DataPoint(idx=0)
        slice_berjalan.graphicalProperties.solidFill = "2E7D32" # Dark green
        slice_berakhir = DataPoint(idx=1)
        slice_berakhir.graphicalProperties.solidFill = "C62828" # Dark red
        pie.series[0].points = [slice_berjalan, slice_berakhir]
        
    # Enable Data Labels to show numerical values on the slices
    pie.dataLabels = DataLabelList()
    pie.dataLabels.showVal = True
    
    # Add Pie Chart to Cell B5 on the visible sheet
    ws_charts.add_chart(pie, "B5")
    
    # 4. Create Bar Chart (Rencana vs Realisasi)
    # Categories: col 4 (D), row 2-4 ("PSB", "PB", "PA")
    # Data: col 5-6 (E-F), row 1-4 (PLAN, REAL)
    chart = BarChart()
    chart.type = "col"
    chart.style = 10
    chart.grouping = "clustered"
    chart.overlap = 0
    chart.y_axis.title = "Jumlah Kontrak"
    chart.x_axis.title = "Jenis Penilaian"
    
    data_bar = Reference(ws_data, min_col=5, min_row=1, max_col=6, max_row=4)
    cats_bar = Reference(ws_data, min_col=4, min_row=2, max_row=4)
    
    chart.add_data(data_bar, titles_from_data=True)
    chart.set_categories(cats_bar)
    chart.width = 16
    chart.height = 9
    
    # Enable Data Labels to show numerical values on the bars
    chart.dataLabels = DataLabelList()
    chart.dataLabels.showVal = True
    
    # Add Bar Chart to Cell H5 on the visible sheet
    ws_charts.add_chart(chart, "H5")
    
    wb.save(file_path)
    print("Charts added successfully")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python add_charts.py <file_path>")
    else:
        add_charts(sys.argv[1])
