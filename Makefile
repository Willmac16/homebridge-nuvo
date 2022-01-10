all: clean zip-send

build: .build

.build: $(src/*.ts)
	tsc
	@touch .build
	@echo "Build called"


clean:
	@rm -f .build
	@rm -f dist/*
	@rm -f hbnv.zip

send: build
	scp -r ~/homebridge-nuvo nuvo:~
	ssh nuvo "cd ~/homebridge-nuvo; sudo npm ci"

zip-send: build
	zip -u ./hbnv.zip -r . -x "*.git*" "*node_modules*" "*.vscode*" "*src*" "NUVO Protocol.pdf" "README.md"
	scp ~/homebridge-nuvo/hbnv.zip nuvo:~/homebridge-nuvo/hbnv.zip
	ssh nuvo "cd ~/homebridge-nuvo; unzip -o hbnv.zip; sudo npm ci"
	