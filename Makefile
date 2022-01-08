

build: .build

.build: $(*.ts)
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
	zip -u ./hbnv.zip -r . -x ./node-modules/* ./.git*
	scp ~/homebridge-nuvo/hbnv.zip nuvo:~/homebridge-nuvo/hbnv.zip
	ssh nuvo "cd ~/homebridge-nuvo; unzip -o hbnv.zip; sudo npm ci"
