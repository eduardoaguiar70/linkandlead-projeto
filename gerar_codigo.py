import os

root_dir = r"c:\Users\mcdud\OneDrive\Ambiente de Trabalho\01_Sistema_linklead_DEFINITIVO"
output_file = os.path.join(root_dir, "codigo_completo.txt")

exclude_dirs = {'node_modules', 'dist', '.git', '.agent', 'public', 'build', '.vite'}
include_extensions = {'.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.sql', '.md'}
exclude_files = {'codigo_completo.txt', 'gerar_codigo.py'}

print("Iniciando a concatenação dos arquivos...")

with open(output_file, 'w', encoding='utf-8') as outfile:
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Prevent searching in excluded directories
        dirnames[:] = [d for d in dirnames if d not in exclude_dirs]
        
        for filename in filenames:
            # We skip package.json and similar unless requested, but let's just include source files.
            if any(filename.endswith(ext) for ext in include_extensions):
                if filename in exclude_files:
                    continue
                filepath = os.path.join(dirpath, filename)
                rel_path = os.path.relpath(filepath, root_dir)
                try:
                    with open(filepath, 'r', encoding='utf-8') as infile:
                        content = infile.read()
                        
                        outfile.write(f"\n\n{'='*80}\n")
                        outfile.write(f"--- File: {rel_path} ---\n")
                        outfile.write(f"{'='*80}\n\n")
                        outfile.write(content)
                except Exception as e:
                    print(f"Erro ao ler {rel_path}: {e}")

print(f"Concluído! O arquivo foi salvo em: {output_file}")
