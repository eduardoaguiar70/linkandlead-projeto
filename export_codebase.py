import os
import datetime

# Configuration
ignored_dirs = {
    "node_modules", ".git", "dist", "build", "coverage", ".vscode", ".idea", 
    "__pycache__", ".agent", ".github", "brain"
}
allowed_extensions = {
    ".js", ".jsx", ".ts", ".tsx", ".css", ".html", ".json", ".md", ".py", ".sql"
}
ignored_files = {
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "sistema_completo.md", "export_codebase.py", "stats.html"
}

def is_allowed(filename):
    if filename in ignored_files:
        return False
    # Explicitly allow .env.example but ignore other dotfiles for security
    if filename.startswith('.'):
        return filename == ".env.example"
        
    ext = os.path.splitext(filename)[1]
    return ext in allowed_extensions

def generate_dump():
    root_dir = os.getcwd()
    output_file = os.path.join(root_dir, "sistema_completo.md")
    
    total_files = 0
    
    with open(output_file, "w", encoding="utf-8") as f_out:
        f_out.write(f"# Exportação do Sistema\n")
        f_out.write(f"Data: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        
        # Walk through directory
        for root, dirs, files in os.walk(root_dir):
            # Modify dirs in-place to skip ignored directories
            dirs[:] = [d for d in dirs if d not in ignored_dirs]
            
            for file in files:
                if not is_allowed(file):
                    continue
                
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, root_dir)
                
                # Skip the output file itself
                if os.path.abspath(file_path) == os.path.abspath(output_file):
                    continue

                try:
                    with open(file_path, "r", encoding="utf-8") as f_in:
                        content = f_in.read()
                        
                    f_out.write(f"## File: {rel_path}\n")
                    # Determine language for markdown block
                    ext = os.path.splitext(file)[1][1:]
                    if not ext: ext = "text"
                    if ext == "jsx" or ext == "js": ext = "javascript"
                    if ext == "tsx" or ext == "ts": ext = "typescript"
                    
                    f_out.write(f"```{ext}\n")
                    f_out.write(content)
                    f_out.write("\n```\n\n")
                    total_files += 1
                except Exception as e:
                    print(f"Skipping binary or unreadable file: {rel_path}")

    return output_file, total_files

if __name__ == "__main__":
    print("Iniciando exportação...")
    output, count = generate_dump()
    print(f"Sucesso! {count} arquivos exportados.")
    print(f"Arquivo gerado: {output}")
