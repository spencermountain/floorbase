# floorbase
Experimental database from the [Freebase project](https://en.wikipedia.org/wiki/Freebase_(database)) as a parquet file

freebase csv file from 
https://developers.google.com/freebase

converted to parquet file 

Notes:
```bash
# install ripgrep
brew install ripgrep

# grep for a string
gzcat /Users/spencer/Desktop/freebase-rdf-latest.gz | rg -a -F 'Rob Ford'

# grep for a property
gzcat /Users/spencer/Desktop/freebase-rdf-latest.gz | rg -a -F 'http://rdf.freebase.com/ns/event.disaster.type_of_disaster'

# grep for a property and save to file
time (gzcat /Users/spencer/Desktop/freebase-rdf-latest.gz | rg -a -F 'http://rdf.freebase.com/ns/time.event.start_date' > start-dates.txt)
```

MIT