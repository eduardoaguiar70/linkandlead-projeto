import glob

files = glob.glob('src/**/*.jsx', recursive=True) + glob.glob('src/**/*.js', recursive=True)

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    original = content
    content = content.replace("'pt-BR'", "'en-US'")
    content = content.replace('"pt-BR"', '"en-US"')
    content = content.replace("ptBR", "enUS")
    content = content.replace("locale='pt-BR'", "locale='en-US'")
    content = content.replace('locale="pt-BR"', 'locale="en-US"')
    content = content.replace("date-fns/locale/pt-BR", "date-fns/locale/en-US")
    
    content = content.replace("R$ ", "$")
    content = content.replace("R$", "$")
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Updated formatting in {filepath}')
