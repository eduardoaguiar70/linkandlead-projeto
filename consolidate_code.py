import os

# Configuration
PROJECT_ROOT = r"c:\Users\mcdud\OneDrive\Ambiente de Trabalho\01_Sistema_linklead_DEFINITIVO"
OUTPUT_FILE = os.path.join(PROJECT_ROOT, "LINKLEAD_CODEBASE_ANALYSIS.md")
EXCLUDED_DIRS = {'.git', 'node_modules', 'dist', '.agent', '.gemini', '.kombai', 'tmp'}
ALLOWED_EXTENSIONS = {'.jsx', '.js', '.css', '.html', '.json', '.sql', '.md'}

def generate_consolidated_code():
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as outfile:
        outfile.write("# Codebase Analysis - LinkLead System\n\n")
        outfile.write(f"This document contains the consolidated source code and configuration files for the LinkLead system.\n\n")

        # Process Root Files first
        root_files = ['package.json', 'vite.config.js', 'tailwind.config.js', 'ARCHITECTURE.md', 'README.md']
        for rf in root_files:
            rf_path = os.path.join(PROJECT_ROOT, rf)
            if os.path.exists(rf_path):
                write_file_to_md(rf_path, PROJECT_ROOT, outfile)

        # Walk through src directory
        src_dir = os.path.join(PROJECT_ROOT, 'src')
        if os.path.exists(src_dir):
            for root, dirs, files in os.walk(src_dir):
                # Modify dirs in-place to exclude unwanted directories
                dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS]
                
                for file in files:
                    ext = os.path.splitext(file)[1].lower()
                    if ext in ALLOWED_EXTENSIONS:
                        file_path = os.path.join(root, file)
                        write_file_to_md(file_path, PROJECT_ROOT, outfile)

    print(f"Consolidated code written to: {OUTPUT_FILE}")

def write_file_to_md(file_path, project_root, outfile):
    rel_path = os.path.relpath(file_path, project_root)
    ext = os.path.splitext(file_path)[1].lower().replace('.', '')
    
    # Map extensions to markdown languages
    lang_map = {
        'jsx': 'javascript',
        'js': 'javascript',
        'json': 'json',
        'css': 'css',
        'html': 'html',
        'sql': 'sql',
        'md': 'markdown'
    }
    lang = lang_map.get(ext, '')

    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as infile:
            content = infile.read()
            outfile.write(f"## File: {rel_path}\n")
            outfile.write(f"```{lang}\n")
            outfile.write(content)
            if not content.endswith('\n'):
                outfile.write('\n')
            outfile.write("```\n\n")
    except Exception as e:
        outfile.write(f"## File: {rel_path} (ERROR READING FILE)\n\n")

if __name__ == "__main__":
    generate_consolidated_code()
