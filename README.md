# floorbase
Experimental database from the [Freebase project](https://en.wikipedia.org/wiki/Freebase_(database)) as a parquet file

freebase csv file from 
https://developers.google.com/freebase

converted to parquet file 

Notes:
```bash
brew install ripgrep
brew install sd
brew install pigz # optional: faster gzip


# grep for a particular topic (anywhere)
gzcat ~/Desktop/freebase-rdf-latest.gz | rg -a -F '<http://rdf.freebase.com/ns/m.05bdcg>'

# grep for a particular subject
gzcat ~/Desktop/freebase-rdf-latest.gz | rg -a '^<http://rdf\.freebase\.com/ns/m\.05bdcg>'

# grep for a property
gzcat ~/Desktop/freebase-rdf-latest.gz | rg -a -F 'http://rdf.freebase.com/ns/event.disaster.type_of_disaster'

# grep for a property and save to file
time (gzcat ~/Desktop/freebase-rdf-latest.gz | rg -a -F 'http://rdf.freebase.com/ns/time.event.start_date' > start-dates.txt) && wc -l ./start-dates.txt

# cleanup rdf cruft
gzcat ~/Desktop/freebase-rdf-latest.gz | rg -a -F 'http://rdf.freebase.com/ns/event.disaster.type_of_disaster' | sd "http://rdf.freebase.com/ns" "" | sd "   ." ""
```

## first pass
```bash
# count lines
gzcat ~/Desktop/freebase-rdf-latest.gz | wc -l
# 3,130,753,066 (3 billion)

# common properties:
notable_for.display_name
# 1,157,934,920 (1 billion) 1/3rd of the data

# accumulated almost another third of the data:
rdf-syntax-ns
# 266,321,867 (200 million)
type.object.type
# 266,321,867 (200 million) 
type.type.instance
# 266,257,391 (200 million) 
type.object.key
# 146,583,100 (200 million) 


```


MIT