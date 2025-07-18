import pandas as pd  # type: ignore[import]
import json
from geojson import Feature, FeatureCollection, Point    # type: ignore[import]

class DataProcessor:
    def __init__(self, file_path):
        # Leer el archivo Excel y parsear fechas
        try:
            self.df = pd.read_excel(
                file_path,
                parse_dates=['Fecha de Inicio', 'Fecha de Finalización Programada']
            )
            print(f"Archivo cargado correctamente. Filas: {len(self.df)}")
            self.clean_data()
        except Exception as e:
            print(f"Error al cargar el archivo: {str(e)}")
            raise
        
    def clean_data(self):
        print("Limpiando datos...")
        # Normalizar nombres de columna
        self.df.columns = [col.strip() for col in self.df.columns]
        
        # Columnas obligatorias
        required_columns = [
            'Longitud', 'Latitud', 'Costo Total',
            'Departamento', 'Municipio', 'Nombre de Proyecto',
            'Estado', 'Función Específica',
            'Fecha de Inicio', 'Fecha de Finalización Programada'
        ]
        for col in required_columns:
            if col not in self.df.columns:
                raise ValueError(f"Columna requerida no encontrada: {col}")
        
        # Convertir numéricos
        self.df['Latitud']  = pd.to_numeric(self.df['Latitud'], errors='coerce')
        self.df['Longitud'] = pd.to_numeric(self.df['Longitud'], errors='coerce')
        self.df['Costo Total'] = pd.to_numeric(self.df['Costo Total'], errors='coerce')
        
        # Asegurar que fechas mal parseadas sean NaT
        self.df['Fecha de Inicio'] = pd.to_datetime(
            self.df['Fecha de Inicio'], errors='coerce'
        )
        self.df['Fecha de Finalización Programada'] = pd.to_datetime(
            self.df['Fecha de Finalización Programada'], errors='coerce'
        )
        
        # Eliminar filas sin coordenadas
        initial_count = len(self.df)
        self.df = self.df.dropna(subset=['Latitud', 'Longitud'])
        final_count = len(self.df)
        print(f"Filas después de limpieza: {final_count} (eliminadas: {initial_count - final_count})")
        
    def get_geojson(self):
        features = []
        for _, row in self.df.iterrows():
            try:
                properties = {
                    'nombre': row['Nombre de Proyecto'],
                    'departamento': row['Departamento'],
                    'municipio': row['Municipio'],
                    'costo': float(row['Costo Total']) if pd.notna(row['Costo Total']) else 0,
                    'estado': row['Estado'],
                    'tipo': row.get('Tipo de Entidad', ''),
                    'ejecutor': row.get('Entidad Ejecutora', ''),
                    'funcion': row['Función Específica'],
                    'proceso': row.get('Proceso', ''),
                    'meta_global': row.get('Meta Global', '')
                }
                if pd.notna(row['Longitud']) and pd.notna(row['Latitud']):
                    point = Point((float(row['Longitud']), float(row['Latitud'])))
                    features.append(Feature(geometry=point, properties=properties))
            except Exception as e:
                print(f"Error procesando fila {_}: {str(e)}")
                continue
        return FeatureCollection(features)
    
    def get_summary_stats(self):
        stats = {
            'total_proyectos': len(self.df),
            'total_inversion': float(self.df['Costo Total'].sum()),
            'proyectos_por_departamento': self.df['Departamento'].value_counts().to_dict(),
            'proyectos_por_estado': self.df['Estado'].value_counts().to_dict(),
            'proyectos_por_funcion': self.df['Función Específica'].value_counts().to_dict(),
            'inversion_por_departamento': self.df.groupby('Departamento')['Costo Total'].sum().to_dict()
        }
        return stats
    
    def get_projects_by_department(self, department):
        # Columnas a devolver, incluyendo las de fecha
        cols = [
            'Nombre de Proyecto',
            'Municipio',
            'Costo Total',
            'Estado',
            'Función Específica',
            'Fecha de Inicio',
            'Fecha de Finalización Programada'
        ]

        sub = self.df[self.df['Departamento'] == department][cols].copy()
        # Reemplazar NaN por None
        sub = sub.where(pd.notnull(sub), None)

        # Formatear tipos
        sub['Costo Total'] = sub['Costo Total'].astype(float)
        # Convertir fechas a cadenas ISO
        sub['Fecha de Inicio'] = sub['Fecha de Inicio'].dt.strftime('%Y-%m-%d')
        sub['Fecha de Finalización Programada'] = sub['Fecha de Finalización Programada'].dt.strftime('%Y-%m-%d')

        return sub.to_dict(orient='records')
    
    def get_all_departments(self):
        return sorted(self.df['Departamento'].unique().tolist())
    
    def get_municipios_by_department(self, department):
        filtered_df = self.df[self.df['Departamento'] == department]
        municipios = sorted(filtered_df['Municipio'].dropna().unique().tolist())
        return municipios
